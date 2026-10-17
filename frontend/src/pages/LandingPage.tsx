import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, ShieldCheck, Building2, CheckSquare, Sparkles,
  ArrowRight, ExternalLink, AlertTriangle, ChevronDown, ChevronUp, Loader2, Clipboard
} from 'lucide-react';
import { fetchSamples, createInvestigation, fetchHealth } from '../api';
import { SampleListing, ListingData } from '../types';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [listingUrl, setListingUrl] = useState('');
  const [builderUrl, setBuilderUrl] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [samples, setSamples] = useState<SampleListing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [health, setHealth] = useState<{ tinyfish_key_present: boolean; mock_mode: boolean } | null>(null);

  // Manual fallback fields
  const [manualData, setManualData] = useState<Partial<ListingData>>({
    project_name: '',
    builder_name: '',
    locality: 'Whitefield',
    city: 'Bangalore',
    price_text: 'Rs 1.25 Cr',
    area_value: 1150,
    area_type: 'super built-up',
    possession_text: 'Dec 2027',
    rera_numbers: ['PRM/KA/RERA/1251/446/PR/171015/000456'],
  });

  useEffect(() => {
    fetchSamples().then(setSamples).catch(console.error);
    fetchHealth().then(setHealth).catch(console.error);
  }, []);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setListingUrl(text.trim());
    } catch (e) {
      console.warn('Clipboard read failed:', e);
    }
  };

  const handleSampleClick = (sample: SampleListing) => {
    setListingUrl(sample.url);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listingUrl && !showManualForm) {
      setErrorMessage('Please enter a property listing URL or use manual entry.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);

      const payload = {
        listing_url: listingUrl || 'https://www.magicbricks.com/manual-entry-property',
        builder_url: builderUrl ? builderUrl.trim() : undefined,
        manual: showManualForm ? (manualData as ListingData) : undefined,
      };

      const res = await createInvestigation(payload);
      navigate(`/investigate/${res.id}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to start investigation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FB]">
      {/* TinyFish unconfigured alert if applicable */}
      {health && !health.tinyfish_key_present && !health.mock_mode && (
        <div className="bg-amber-500 text-slate-900 font-semibold px-4 py-2.5 text-center text-xs sm:text-sm flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>TinyFish is not configured: Please set TINYFISH_API_KEY in backend/.env</span>
        </div>
      )}

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#0B1F3A] via-[#0F274A] to-[#14325C] text-white pt-12 pb-20 px-4 sm:px-6 lg:px-8 border-b border-[#14325C]">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#14325C]/80 border border-[#0F9D8A]/50 text-teal-300 text-xs font-semibold shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#14B8A6]" />
            <span>Autonomous Due Diligence for High-Stakes Home Purchases</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
            Verify the property <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-teal-300 to-emerald-400">
              before you pay.
            </span>
          </h1>

          <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Paste a listing link. Our web agents check the builder’s site and the RERA portal,
            then show you what matches, what conflicts and what still needs proof.
          </p>

          {/* Large Input Card */}
          <div className="mt-8 bg-white text-slate-900 p-4 sm:p-6 rounded-3xl shadow-xl border border-slate-200 text-left max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative flex flex-col sm:flex-row items-stretch gap-2.5">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-5 h-5" />
                  </div>
                  <input
                    type="url"
                    value={listingUrl}
                    onChange={(e) => {
                      setListingUrl(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="Paste listing URL (e.g. Magicbricks, 99acres, Housing)..."
                    disabled={isLoading || showManualForm}
                    className="w-full pl-11 pr-24 py-3.5 rounded-2xl border border-slate-300 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 disabled:bg-slate-100 disabled:text-slate-500 transition-all font-mono text-xs sm:text-sm"
                  />
                  {!showManualForm && (
                    <button
                      type="button"
                      onClick={handlePaste}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Clipboard className="w-3.5 h-3.5" />
                      <span>Paste</span>
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-3.5 rounded-2xl bg-[#0F9D8A] hover:bg-[#0D8776] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all shrink-0 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Dispatching Agents...</span>
                    </>
                  ) : (
                    <>
                      <span>Investigate this listing</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Inline Validation Error */}
              {errorMessage && (
                <div className="text-xs sm:text-sm text-rose-600 font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Sample Chips */}
              {samples.length > 0 && !showManualForm && (
                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Try a sample:</span>
                  {samples.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSampleClick(s)}
                      className="text-xs px-2.5 py-1 rounded-full bg-slate-100 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-300 border border-slate-200 font-medium text-slate-700 transition-all"
                    >
                      {s.name} ({s.tag})
                    </button>
                  ))}
                </div>
              )}

              {/* Collapsible Advanced Form */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1 transition-colors"
                >
                  {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  <span>Advanced Parameters & Manual Entry Fallback</span>
                </button>

                {showAdvanced && (
                  <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Optional Builder Website URL (Overrides discovery search):
                      </label>
                      <input
                        type="url"
                        value={builderUrl}
                        onChange={(e) => setBuilderUrl(e.target.value)}
                        placeholder="https://www.brigadegroup.com/residential/project/..."
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono"
                      />
                    </div>

                    <div className="pt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showManualForm}
                          onChange={(e) => setShowManualForm(e.target.checked)}
                          className="w-4 h-4 text-teal-600 rounded border-slate-300"
                        />
                        <span className="text-xs font-semibold text-slate-700">
                          I can't share a link, enter details manually
                        </span>
                      </label>
                    </div>

                    {showManualForm && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                        <div>
                          <label className="block text-slate-600 mb-0.5">Project Name</label>
                          <input
                            type="text"
                            value={manualData.project_name || ''}
                            onChange={(e) => setManualData({ ...manualData, project_name: e.target.value })}
                            className="w-full p-2 border rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 mb-0.5">Builder Name</label>
                          <input
                            type="text"
                            value={manualData.builder_name || ''}
                            onChange={(e) => setManualData({ ...manualData, builder_name: e.target.value })}
                            className="w-full p-2 border rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 mb-0.5">RERA Number</label>
                          <input
                            type="text"
                            value={manualData.rera_numbers?.[0] || ''}
                            onChange={(e) => setManualData({ ...manualData, rera_numbers: [e.target.value] })}
                            className="w-full p-2 border rounded font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 mb-0.5">Price Text</label>
                          <input
                            type="text"
                            value={manualData.price_text || ''}
                            onChange={(e) => setManualData({ ...manualData, price_text: e.target.value })}
                            className="w-full p-2 border rounded"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* 3-Step Process Strip */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 -mt-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start gap-3.5">
            <span className="w-8 h-8 rounded-full bg-[#E6F6F3] text-[#0F9D8A] font-extrabold flex items-center justify-center shrink-0">
              1
            </span>
            <div>
              <h3 className="text-sm font-bold text-[#0B1F3A]">Paste Listing Link</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Provide any Bangalore or Karnataka property listing URL from Magicbricks, 99acres or housing.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <span className="w-8 h-8 rounded-full bg-[#EAF1FE] text-[#2563EB] font-extrabold flex items-center justify-center shrink-0">
              2
            </span>
            <div>
              <h3 className="text-sm font-bold text-[#0B1F3A]">Agents Investigate Live</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                TinyFish autonomous web agents visit the listing, search official builder portals, and query Karnataka RERA.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <span className="w-8 h-8 rounded-full bg-[#E8F8EE] text-[#16A34A] font-extrabold flex items-center justify-center shrink-0">
              3
            </span>
            <div>
              <h3 className="text-sm font-bold text-[#0B1F3A]">Get an Evidence Report</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Receive an audit file comparing claims, flagging discrepancies, and providing exact questions before paying.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What We Check (4 Cards) */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F3A]">
            Four Deterministic Checks
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Reconciled strictly by verified Python rules with linked evidence citations
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
            <div className="p-3 rounded-xl bg-teal-50 text-teal-700 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0B1F3A]">A. Karnataka RERA Registration</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Searches rera.karnataka.gov.in by number or project name. Reconciles registered promoter legal entity, sanctioned completion date, and approval status.
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
            <div className="p-3 rounded-xl bg-blue-50 text-blue-700 shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0B1F3A]">B. Builder & Project Identity</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                DuckDuckGo discovery agent locates the verified official builder site. Fuzzy matching strips marketing phase tokens to match developer legal records.
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
            <div className="p-3 rounded-xl bg-indigo-50 text-indigo-700 shrink-0">
              <CheckSquare className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0B1F3A]">C. Amenities Evidence Ladder</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Synonym dictionary canonicalizes claims. Distinguishes active amenities from those marked "planned for future phase" or unlisted by the builder.
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0B1F3A]">D. Price, Area & Possession Date</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Identifies carpet vs super built-up trap (NOT_COMPARABLE_MEASURE). Converts sq m to sq ft and alerts on possession gaps exceeding 12 months.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0B1F3A] text-slate-400 py-8 px-4 border-t border-[#14325C] text-center text-xs">
        <div className="max-w-5xl mx-auto space-y-2">
          <p className="text-slate-300 font-semibold">
            Property Truth Finder &bull; Built with TinyFish Autonomous Web Agents
          </p>
          <p className="text-[11px] text-slate-500">
            Hackathon submission for Ignite With Bangalore &bull; Track: Best Use of the TinyFish Platform
          </p>
        </div>
      </footer>
    </div>

  );
};
