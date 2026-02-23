import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Ticket, 
  BarChart3, 
  Settings,
  Bot,
  Activity
} from 'lucide-react';

export default function Sidebar() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Command Center', icon: LayoutDashboard },
    { path: '/tickets', label: 'Tickets', icon: Ticket },
    { path: '/agents', label: 'Agent Swarm', icon: Bot },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <aside className="w-64 h-screen fixed left-0 top-0 z-50 flex flex-col border-r border-white/5 bg-slate-950/30 backdrop-blur-xl">
      {/* Logo Area */}
      <div className="p-6">
        <div className="flex items-center space-x-3 group cursor-pointer">
          <div className="relative w-10 h-10 flex items-center justify-center bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl border border-white/10 group-hover:border-indigo-500/50 transition-all duration-300 shadow-lg shadow-indigo-500/5">
            <Bot className="w-6 h-6 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
            <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-white">SupportGenius</h1>
            <div className="flex items-center space-x-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-medium text-emerald-500 uppercase tracking-wider">Systems Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
        <div className="px-4 mb-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Operations</p>
        </div>
        
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.path === '/' 
            ? location.pathname === '/' 
            : location.pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`relative flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 group overflow-hidden ${
                isActive 
                  ? 'bg-white/5 text-white shadow-lg shadow-black/20 border border-white/5' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5 hover:border hover:border-white/5'
              }`}
            >
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent opacity-50" />
              )}
              <Icon className={`w-5 h-5 relative z-10 transition-transform duration-300 group-hover:scale-110 ${
                isActive ? 'text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]' : 'text-slate-500 group-hover:text-indigo-300'
              }`} />
              <span className={`font-medium text-sm relative z-10 ${isActive ? 'tracking-wide' : ''}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)] animate-pulse" />
              )}
            </Link>
          );
        })}

        <div className="px-4 mt-8 mb-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Configuration</p>
        </div>

        <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-300 group hover:border hover:border-white/5">
          <Settings className="w-5 h-5 text-slate-500 group-hover:text-indigo-300 transition-transform duration-300 group-hover:rotate-90" />
          <span className="font-medium text-sm">Settings</span>
        </button>
      </nav>

      {/* Footer / User Profile */}
      <div className="p-4 border-t border-white/5 bg-black/20 backdrop-blur-md">
        <button className="flex items-center space-x-3 w-full p-2 rounded-xl hover:bg-white/5 transition-all duration-300 hover:border hover:border-white/5 group relative overflow-hidden">
          <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center shadow-lg group-hover:shadow-indigo-500/20 transition-all duration-300">
            <span className="text-xs font-bold text-indigo-300">AD</span>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-900" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-white group-hover:text-indigo-300 transition-colors truncate">Admin User</p>
            <p className="text-[10px] text-slate-500 truncate group-hover:text-slate-400">admin@supportgenius.ai</p>
          </div>
          <Activity className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0" />
        </button>
      </div>
    </aside>
  );
}
