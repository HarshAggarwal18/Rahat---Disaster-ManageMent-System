import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-20 w-[40rem] h-[40rem] bg-indigo-600/20 rounded-full blur-[140px]"></div>
        <div className="absolute -bottom-32 -right-20 w-[40rem] h-[40rem] bg-rose-600/20 rounded-full blur-[140px]"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-[0.05]"></div>
      </div>

      <header className="relative z-10 max-w-7xl mx-auto px-6 pt-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-black tracking-tight">RAHAT RESPONSE</span>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link to="/auth" className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white">Login</Link>
            <Link to="/auth?mode=signup" className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-500/20 hover:bg-indigo-500">Get Started</Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-indigo-400 font-semibold mb-4">Disaster Intelligence Platform</p>
            <h1 className="text-4xl md:text-6xl font-black leading-tight mb-6">
              Coordinate Every Response with
              <span className="block text-indigo-400">Real-Time Clarity</span>
            </h1>
            <p className="text-lg text-slate-300 mb-8">
              Rahat Response unifies incident reporting, AI triage, volunteer dispatch, and live operations
              in one mission control interface designed for critical moments.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/auth?mode=signup" className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-500/30 hover:bg-indigo-500">
                Create Account
              </Link>
              <Link to="/auth" className="px-6 py-3 rounded-xl border border-slate-700 text-slate-200 font-semibold hover:border-slate-500">
                Explore Dashboard
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-4 text-sm text-slate-400">
              <span className="px-3 py-1 bg-slate-900/70 border border-slate-800 rounded-full">AI Triage</span>
              <span className="px-3 py-1 bg-slate-900/70 border border-slate-800 rounded-full">Live Dispatch</span>
              <span className="px-3 py-1 bg-slate-900/70 border border-slate-800 rounded-full">Volunteer Coordination</span>
            </div>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Live Incident Preview</h2>
              <span className="text-xs text-rose-400">Critical</span>
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-indigo-300">Incident #{item}</span>
                    <span className="text-xs text-slate-500">2m ago</span>
                  </div>
                  <p className="text-sm text-slate-300">Multi-response required in Zone {item}. Volunteers dispatched.</p>
                </div>
              ))}
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-950/60 rounded-xl p-3">
                <p className="text-2xl font-black text-white">24</p>
                <p className="text-xs text-slate-400">Active</p>
              </div>
              <div className="bg-slate-950/60 rounded-xl p-3">
                <p className="text-2xl font-black text-white">98%</p>
                <p className="text-xs text-slate-400">Resolved</p>
              </div>
              <div className="bg-slate-950/60 rounded-xl p-3">
                <p className="text-2xl font-black text-white">7m</p>
                <p className="text-xs text-slate-400">Avg ETA</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
