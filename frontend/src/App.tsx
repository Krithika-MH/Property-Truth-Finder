import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { MissionControlPage } from './pages/MissionControlPage';
import { ReportPage } from './pages/ReportPage';
import { HowItWorksPage } from './pages/HowItWorksPage';

function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-4xl font-extrabold text-[#0B1F3A] mb-2">404</h1>
      <p className="text-slate-600 mb-6">The page you requested could not be found.</p>
      <Link
        to="/"
        className="px-5 py-2.5 rounded-xl bg-[#0F9D8A] text-white font-bold text-sm shadow hover:bg-[#0D8776] transition-all"
      >
        Return to Home
      </Link>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-[#F6F8FB]">
        <Navbar />
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/investigate/:id" element={<MissionControlPage />} />
            <Route path="/report/:id" element={<ReportPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
