import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Printer, Copy, Share2, RefreshCw, ExternalLink, ShieldCheck,
  Building2, CheckCircle2, AlertTriangle, HelpCircle, ArrowLeft, Loader2
} from 'lucide-react';
import { fetchInvestigationReport, rerunInvestigation } from '../api';
import { Report } from '../types';
import { ModeRibbon } from '../components/ModeRibbon';
import { CoverageRing } from '../components/CoverageRing';
import { FindingCard } from '../components/FindingCard';
import { ComparisonMatrix } from '../components/ComparisonMatrix';
import { AmenitiesTable } from '../components/AmenitiesTable';
import { BuyerChecklist } from '../components/BuyerChecklist';
import { EvidenceLedger } from '../components/EvidenceLedger';
import { HowThisWasInvestigated } from '../components/HowThisWasInvestigated';

export const ReportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isRerunning, setIsRerunning] = useState(false);
  const [builderUrlOverride, setBuilderUrlOverride] = useState('');
  const [showRerunModal, setShowRerunModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchInvestigationReport(id)
      .then((data) => {
        setReport(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Could not load report');
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#0F9D8A] mb-4" />
        <h2 className="text-lg font-bold text-[#0B1F3A]">Compiling Due Diligence Audit Report...</h2>
        <p className="text-xs text-slate-500 mt-1">Reconciling evidence ledger and running verification checks</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900">Report Not Found</h2>
        <p className="text-sm text-slate-600 mt-1 mb-6">{error || 'Investigation data unavailable'}</p>
        <button
          onClick={() => navigate('/')}
          className="px-5 py-2.5 rounded-xl bg-[#0B1F3A] text-white text-sm font-semibold flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return Home</span>
        </button>
      </div>
    );
  }

  // Tally verdicts
  const allRows = report.findings.flatMap((f) => f.rows);
  const matchedCount = allRows.filter((r) => r.verdict === 'MATCHED').length;
  const mismatchCount = allRows.filter((r) => r.verdict === 'MISMATCH').length;
  const notVerifiedCount = allRows.filter((r) => r.verdict === 'NOT_VERIFIED').length;

  const findingC = report.findings.find((f) => f.check_id === 'C');

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(report.summary);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const handleShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleRerun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      setIsRerunning(true);
      const res = await rerunInvestigation(id, builderUrlOverride || undefined);
      setShowRerunModal(false);
      navigate(`/investigate/${res.id}`);
    } catch (err) {
      alert('Failed to re-run investigation');
    } finally {
      setIsRerunning(false);
    }
  };

  const projectName = (report.listing?.project_name && !['n/a', 'none', 'null'].includes(report.listing.project_name.toLowerCase()))
    ? report.listing.project_name
    : (report.builder?.project_name || report.rera?.project_name || 'Property Verification Report');

  const developerName = (report.listing?.builder_name && !['n/a', 'none', 'null'].includes(report.listing.builder_name.toLowerCase()))
    ? report.listing.builder_name
    : (report.builder?.developer_name || report.rera?.promoter_name || 'Not stated');

  const locality = (report.listing?.locality && !['n/a', 'none', 'null'].includes(report.listing.locality.toLowerCase()))
    ? report.listing.locality
    : (report.builder?.location_text || report.rera?.district || 'Bengaluru');

  const city = (report.listing?.city && !['n/a', 'none', 'null'].includes(report.listing.city.toLowerCase()))
    ? report.listing.city
    : 'Karnataka';

  const configBhk = (report.listing?.config_bhk && !['n/a', 'none', 'null'].includes(report.listing.config_bhk.toLowerCase()))
    ? report.listing.config_bhk
    : (report.builder?.configs?.[0]?.label || 'Residential Unit');

  return (
    <div className="min-h-screen bg-[#F6F8FB] flex flex-col">
      {/* Mode Ribbon */}
      <ModeRibbon mode={report.mode} recordedAt={report.created_at} />

      {/* Main Container */}
      <main className="print-container flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Section 1: Report Header */}
        <header className="card-print bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded border border-teal-200">
                  Due Diligence Audit File
                </span>
                <span className="text-xs text-slate-400 font-mono">ID: {report.id}</span>
              </div>

              <h1 className="text-xl sm:text-3xl font-extrabold text-[#0B1F3A] tracking-tight">
                {projectName}
              </h1>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs sm:text-sm text-slate-600">
                <span><strong>Developer:</strong> {developerName}</span>
                <span>&bull;</span>
                <span><strong>Location:</strong> {locality}, {city}</span>
                <span>&bull;</span>
                <span><strong>Config:</strong> {configBhk}</span>
              </div>


              <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500 pt-1 font-mono">
                <span>Investigated on {report.created_at} IST</span>
                {report.listing_url && (
                  <>
                    <span>&bull;</span>
                    <a
                      href={report.listing_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-teal-700 hover:text-teal-900 underline inline-flex items-center gap-1 font-sans"
                    >
                      <span>View Source Listing</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="no-print flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                onClick={handlePrint}
                className="px-3.5 py-2 rounded-xl bg-[#0B1F3A] hover:bg-[#14325C] text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Save as PDF / Print</span>
              </button>

              <button
                onClick={handleCopySummary}
                className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <Copy className="w-4 h-4" />
                <span>{copiedSummary ? 'Copied' : 'Copy Summary'}</span>
              </button>

              <button
                onClick={handleShareLink}
                className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>{copiedLink ? 'Link Copied' : 'Share'}</span>
              </button>

              <button
                onClick={() => setShowRerunModal(true)}
                className="px-3 py-2 rounded-xl border border-teal-300 hover:bg-teal-50 text-xs sm:text-sm font-semibold text-teal-800 flex items-center gap-1.5 transition-colors"
                title="Wrong builder site? Override URL and re-run"
              >
                <RefreshCw className="w-4 h-4 text-teal-600" />
                <span>Re-run with Builder URL</span>
              </button>
            </div>
          </div>
        </header>

        {/* Section 2: Summary Band with Coverage Ring */}
        <section aria-labelledby="summary-heading" className="space-y-4">
          <h2 id="summary-heading" className="sr-only">Executive Summary and Verification Coverage</h2>
          <CoverageRing
            coveragePct={report.metrics.coverage_pct}
            fieldsVerified={report.metrics.fields_verified}
            fieldsCompared={report.metrics.fields_compared}
            matchedCount={matchedCount}
            mismatchCount={mismatchCount}
            notVerifiedCount={notVerifiedCount}
          />

          {/* LLM Narrative Summary */}
          {report.summary && (
            <div className="card-print bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-sm text-slate-800 leading-relaxed">
              <div className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-1">
                Executive Synthesis
              </div>
              <p>{report.summary}</p>
            </div>
          )}
        </section>

        {/* Section 4: Four Finding Cards (2x2 Grid) */}

        <section aria-labelledby="findings-heading">
          <div className="flex items-center justify-between mb-4">
            <h2 id="findings-heading" className="text-lg sm:text-xl font-extrabold text-[#0B1F3A]">
              Detailed Verification Findings (Checks A to D)
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              Click &quot;View evidence&quot; on any card to inspect raw source captures
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {report.findings.map((f) => (
              <FindingCard
                key={f.check_id}
                finding={f}
                evidenceLedger={report.evidence}
              />
            ))}
          </div>
        </section>

        {/* Section 5: Cross-Source Comparison Matrix */}
        <ComparisonMatrix
          findings={report.findings}
          listingUrl={report.listing_url}
          builderUrl={report.builder_site_url}
          reraUrl="https://rera.karnataka.gov.in"
        />

        {/* Section 6: Amenities Table (Check C Detail) */}
        {findingC && <AmenitiesTable findingC={findingC} />}

        {/* Section 7: Buyer Due Diligence Checklist */}
        <BuyerChecklist checklist={report.buyer_checklist} />

        {/* Section 8: Verifiable Evidence Ledger */}
        <EvidenceLedger evidence={report.evidence} />

        {/* Section 9: How This Was Investigated (Metrics Strip & Agent Cards) */}
        <HowThisWasInvestigated
          agents={report.agents}
          metrics={report.metrics}
        />

        {/* Section 10: Footer */}
        <footer className="pt-6 pb-12 border-t border-slate-200 text-center text-xs text-slate-500 space-y-1">
          <p className="font-medium text-slate-700">
            Property Truth Finder &bull; Evidence-First Due Diligence
          </p>
        </footer>
      </main>

      {/* Re-run with Builder URL Modal */}
      {showRerunModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-[#0B1F3A] mb-1">
              Re-run Investigation with Custom Builder URL
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Wrong site discovered? Paste the exact builder project URL to re-trigger Agents B and R.
            </p>

            <form onSubmit={handleRerun} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Builder Official Project URL:
                </label>
                <input
                  type="url"
                  required
                  value={builderUrlOverride}
                  onChange={(e) => setBuilderUrlOverride(e.target.value)}
                  placeholder="https://www.builder.com/projects/..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRerunModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRerunning}
                  className="px-4 py-2 rounded-lg bg-[#0F9D8A] hover:bg-[#0D8776] text-white text-xs font-bold transition-colors"
                >
                  {isRerunning ? 'Launching...' : 'Start Re-run'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
