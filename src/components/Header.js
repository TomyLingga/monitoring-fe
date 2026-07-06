import React from 'react';
import { RefreshCw, Sun, Moon } from 'lucide-react';

export default function Header({ title, onRefresh, isRefreshing, onToggleTheme, currentTheme }) {
  const isLight = currentTheme === 'light';

  return (
    <header className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 pb-6 border-b border-slate-800/80">
      <div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">{title}</h2>
        <div className="flex items-center space-x-2 mt-1.5">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
          </span>
          <p className="text-xs text-slate-400">Database connected: PostgreSQL (monitoring)</p>
        </div>
      </div>

      <div className="flex items-center space-x-3 mt-4 md:mt-0">
        {/* Light / Dark Mode Toggle button */}
        <button
          onClick={onToggleTheme}
          className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all shadow-md"
          title={isLight ? "Beralih ke Dark Mode" : "Beralih ke Light Mode"}
        >
          {isLight ? (
            <Moon className="h-4.5 w-4.5 text-amber-500 animate-pulse-slow" />
          ) : (
            <Sun className="h-4.5 w-4.5 text-yellow-400 animate-pulse-slow" />
          )}
        </button>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all disabled:opacity-50"
          title="Refresh Data"
        >
          <RefreshCw className={`h-4.5 w-4.5 ${isRefreshing ? 'animate-spin text-teal-400' : ''}`} />
        </button>
      </div>
    </header>
  );
}
