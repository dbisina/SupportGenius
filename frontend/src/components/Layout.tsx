import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import { Bell, Search, Wifi } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen text-foreground flex relative overflow-hidden selection:bg-indigo-500/30">
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-900/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-900/10 blur-[120px]" />
      </div>

      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen relative z-10 transition-all duration-300">
        
        {/* Floating Header */}
        <header className="h-16 mt-4 mx-6 glass-panel rounded-2xl px-6 flex items-center justify-between sticky top-4 z-40 transition-all duration-300 hover:bg-slate-900/60 hover:border-white/10 group">
          <div className="flex items-center space-x-4 flex-1">
            <div className="relative w-96 group/search">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-hover/search:text-indigo-400 transition-colors" />
              <input 
                type="text" 
                placeholder="Search command..." 
                className="w-full bg-white/5 border border-white/5 rounded-xl pl-10 pr-12 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-white placeholder:text-slate-500 transition-all focus:bg-white/10"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                <span className="p-1 rounded bg-white/10 text-[10px] text-slate-400 font-mono">⌘</span>
                <span className="p-1 rounded bg-white/10 text-[10px] text-slate-400 font-mono">K</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3 text-sm text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
              <Wifi className="w-3.5 h-3.5" />
              <span className="font-semibold tracking-wide text-xs">NETWORK STABLE</span>
            </div>
            
            <button className="relative p-2.5 rounded-full hover:bg-white/10 transition-colors group/bell">
              <Bell className="w-5 h-5 text-slate-400 group-hover/bell:text-white transition-colors" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full border-2 border-slate-900 animate-pulse"></span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-8 pb-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
