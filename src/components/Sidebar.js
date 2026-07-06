import React from 'react';
import { 
  LayoutDashboard, 
  Database,
  LogOut,
  ChevronLeft,
  Menu 
} from 'lucide-react';

export default function Sidebar({ currentTab, setCurrentTab, user, onLogout, isOpen, onToggle }) {
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard Sourcing', icon: LayoutDashboard },
    { id: 'master', name: 'Master Data', icon: Database },
  ];

  return (
    <aside className={`w-80 h-screen fixed left-0 top-0 glass-card rounded-r-3xl border-r border-t-0 border-b-0 border-l-0 flex flex-col justify-between p-6 z-35 transition-transform duration-300 ease-in-out ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    }`}>
      {/* Absolute positioned toggle tab on the right edge */}
      <button
        onClick={onToggle}
        className="absolute right-[-36px] top-6 p-2 rounded-r-xl bg-[#0b1329]/95 hover:bg-slate-900 border-t border-r border-b border-slate-800 text-teal-400 hover:text-teal-300 shadow-lg shadow-slate-950/60 transition-all z-45"
        title={isOpen ? "Tutup Sidebar" : "Buka Sidebar"}
      >
        {isOpen ? <ChevronLeft className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
      </button>

      <div>
        {/* Logo */}
        <div className="flex items-center space-x-3 mb-10 px-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-teal-400 to-sky-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <span className="font-extrabold text-lg text-white">CPO</span>
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight text-white">Antigravity CPO</h1>
            <p className="text-xs text-slate-400">Supply Chain Hub</p>
          </div>
        </div>

        {/* Menu Navigation */}
        <nav className="space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center space-x-3.5 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-teal-500/20 to-sky-500/10 text-teal-300 border-l-4 border-teal-400 pl-3 shadow-inner'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border-l-4 border-transparent'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Session Info */}
      <div className="border-t border-slate-800 pt-6">
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-full bg-slate-700 flex items-center justify-center font-bold text-teal-300 ring-2 ring-slate-800">
              {user?.name ? user.name[0] : 'A'}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-sm font-semibold text-white truncate max-w-[140px]">{user?.name || 'Admin'}</h4>
              <p className="text-xs text-slate-400 truncate max-w-[140px]">{user?.email || 'admin@cpo.com'}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            title="Log Out"
            className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <div className="text-[10px] text-center text-slate-500 bg-slate-900/50 py-1.5 rounded-md">
          v1.0.0 • Connected to DB postgres
        </div>
      </div>
    </aside>
  );
}
