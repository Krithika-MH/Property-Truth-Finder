import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlayCircle, ShieldCheck, HelpCircle, Loader2 } from 'lucide-react';
import { startDemoReplay } from '../api';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const [isReplaying, setIsReplaying] = useState(false);

  const handleReplayClick = async () => {
    try {
      setIsReplaying(true);
      const res = await startDemoReplay();
      navigate(`/investigate/${res.id}`);
    } catch (err) {
      console.error(err);
      alert('Could not start demo replay');
    } finally {
      setIsReplaying(false);
    }
  };

  return (
    <header className="no-print bg-[#0B1F3A] border-b border-[#14325C] sticky top-0 z-50 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1F3A]">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0F9D8A] to-[#14325C] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <circle cx="11" cy="11" r="3"/>
              <line x1="21" y1="21" x2="13.5" y2="13.5"/>
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight flex items-center gap-1.5 text-white">
              Property Truth Finder
            </span>
            <span className="text-[11px] text-[#14B8A6] font-medium tracking-wide">
              Evidence-First Real Estate Due Diligence
            </span>
          </div>
        </Link>

        {/* Center / Right Links */}
        <div className="flex items-center gap-3 sm:gap-6">
          <Link
            to="/how-it-works"
            className="text-xs sm:text-sm font-medium text-slate-300 hover:text-white flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-[#14325C] transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-[#14B8A6]" />
            <span className="hidden sm:inline">How it works</span>
          </Link>

          <button
            onClick={handleReplayClick}
            disabled={isReplaying}
            className="text-xs sm:text-sm font-semibold text-slate-200 hover:text-white flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-[#14325C] hover:bg-[#1D457D] border border-slate-700 transition-all disabled:opacity-50"
            title="Watch a pre-recorded real investigation"
          >
            {isReplaying ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#14B8A6]" />
            ) : (
              <PlayCircle className="w-4 h-4 text-[#14B8A6]" />
            )}
            <span>Replay a real run</span>
          </button>

          {/* Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0F274A] border border-[#14325C] text-[11px] font-semibold text-teal-400">
            <span className="w-2 h-2 rounded-full bg-[#14B8A6] animate-pulse"></span>
            <span>Powered by TinyFish</span>
          </div>
        </div>
      </div>
    </header>
  );
};
