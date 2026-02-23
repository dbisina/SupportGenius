import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Zap, GitBranch, Search, Filter, MoreHorizontal, CheckCircle2, AlertCircle } from 'lucide-react';
import { submitTicket, listTickets } from '../services/api';

export default function Tickets() {
  const navigate = useNavigate();
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'orchestrated' | 'autonomous'>('orchestrated');
  const [formData, setFormData] = useState({
    customer_email: '',
    subject: '',
    description: '',
    order_id: '',
  });

  useEffect(() => {
    loadTickets();
    const interval = setInterval(loadTickets, 10000); 
    return () => clearInterval(interval);
  }, []);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const data = await listTickets({ limit: 50 });
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load tickets:', err);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const result = await submitTicket({
        customer_email: formData.customer_email,
        subject: formData.subject,
        description: formData.description,
        order_id: formData.order_id || undefined,
        mode,
      });

      navigate(`/tickets/${result.ticket_id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to submit ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const getTimeAgo = (date: Date | string) => {
    const now = new Date();
    const ticketDate = new Date(date);
    const diffMs = now.getTime() - ticketDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-4xl font-bold tracking-tight text-white mb-2">Command Center</h2>
          <p className="text-slate-400">Incoming Support & Incident Stream</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadTickets}
            disabled={loading}
            className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 text-slate-300 px-4 py-2 rounded-xl transition-colors disabled:opacity-50 border border-white/5"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowNewTicket(true)}
            className="flex items-center space-x-2 bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-2 rounded-xl transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">New Signal</span>
          </button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="glass-panel p-2 rounded-xl flex items-center justify-between">
        <div className="flex items-center space-x-2 px-2">
            <Search className="w-5 h-5 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search by ID, subject, or customer..." 
              className="bg-transparent border-none focus:ring-0 text-white placeholder-slate-500 w-64 md:w-96"
            />
        </div>
        <div className="flex items-center space-x-2">
           <button className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-colors">
             <Filter className="w-5 h-5" />
           </button>
           <button className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-colors">
             <MoreHorizontal className="w-5 h-5" />
           </button>
        </div>
      </div>

      {/* Data Grid */}
      <div className="glass-panel rounded-2xl overflow-hidden min-h-[600px] flex flex-col">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 bg-white/[0.02] text-xs font-semibold text-slate-400 uppercase tracking-wider">
           <div className="col-span-1">ID</div>
           <div className="col-span-4">Subject</div>
           <div className="col-span-3">Customer</div>
           <div className="col-span-2">Status</div>
           <div className="col-span-2 text-right">Time</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-white/5">
          {loading && tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500">
               <RefreshCw className="w-10 h-10 animate-spin mb-4 opacity-50" />
               <p>Synchronizing with grid...</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500">
               <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                 <CheckCircle2 className="w-8 h-8 opacity-50" />
               </div>
               <p>All clear. No active signals.</p>
            </div>
          ) : (
            tickets.map((ticket) => (
              <div 
                key={ticket.ticket_id}
                onClick={() => navigate(`/tickets/${ticket.ticket_id}`)}
                className="grid grid-cols-12 gap-4 p-4 hover:bg-white/[0.04] transition-colors cursor-pointer group items-center"
              >
                 <div className="col-span-1 font-mono text-xs text-slate-500 group-hover:text-indigo-400 transition-colors truncate">
                    #{ticket.ticket_id.substring(0, 8)}
                 </div>
                 <div className="col-span-4 text-sm font-medium text-slate-200 group-hover:text-white truncate pr-4">
                    {ticket.subject}
                 </div>
                 <div className="col-span-3 text-xs text-slate-400 truncate">
                    {ticket.customer_id}
                 </div>
                 <div className="col-span-2">
                    <StatusBadge status={ticket.status} />
                 </div>
                 <div className="col-span-2 text-right text-xs text-slate-500 group-hover:text-slate-300">
                    {getTimeAgo(ticket.created_at)}
                 </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {showNewTicket && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel w-full max-w-2xl p-0 overflow-hidden relative shadow-2xl shadow-black/50">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
               <h3 className="text-xl font-bold text-white flex items-center">
                 <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center mr-3 border border-indigo-500/30">
                    <Plus className="w-5 h-5 text-indigo-400" />
                 </div>
                 New Incident Signal
               </h3>
               <button onClick={() => setShowNewTicket(false)} className="text-slate-500 hover:text-white transition-colors">
                  <span className="text-2xl">&times;</span>
               </button>
            </div>
            
            <div className="p-6 md:p-8">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}
              
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-5">
                   <div className="space-y-1.5">
                     <label htmlFor="customer_email" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Customer Email</label>
                     <input
                       id="customer_email"
                       type="email"
                       name="customer_email"
                       value={formData.customer_email}
                       onChange={handleInputChange}
                       required
                       className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                       placeholder="user@example.com"
                     />
                   </div>
                   <div className="space-y-1.5">
                     <label htmlFor="order_id" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Reference ID</label>
                     <input
                       id="order_id"
                       type="text"
                       name="order_id"
                       value={formData.order_id}
                       onChange={handleInputChange}
                       className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                       placeholder="ORD-..."
                     />
                   </div>
                </div>

                 <div className="space-y-1.5">
                    <label htmlFor="subject" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Subject</label>
                    <input
                      id="subject"
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      required
                      className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                      placeholder="Brief incident summary"
                    />
                 </div>

                 <div className="space-y-1.5">
                    <label htmlFor="description" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</label>
                    <textarea
                      id="description"
                      rows={4}
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                      className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none resize-none"
                      placeholder="Detailed incident report..."
                    />
                 </div>

                <div className="space-y-1.5 pt-2">
                   <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Resolution Strategy</label>
                   <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setMode('autonomous')}
                        className={`flex items-start space-x-3 p-4 rounded-xl border transition-all text-left ${
                          mode === 'autonomous'
                            ? 'border-indigo-500/50 bg-indigo-500/10'
                            : 'border-white/5 bg-white/5 hover:border-white/10'
                        }`}
                      >
                        <Zap className={`w-5 h-5 ${mode === 'autonomous' ? 'text-indigo-400' : 'text-slate-500'}`} />
                        <div>
                          <p className={`text-sm font-semibold ${mode === 'autonomous' ? 'text-white' : 'text-slate-300'}`}>Autonomous</p>
                          <p className="text-xs text-slate-500 mt-1">Full agent swarm with tool access.</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMode('orchestrated')}
                        className={`flex items-start space-x-3 p-4 rounded-xl border transition-all text-left ${
                          mode === 'orchestrated'
                            ? 'border-emerald-500/50 bg-emerald-500/10'
                            : 'border-white/5 bg-white/5 hover:border-white/10'
                        }`}
                      >
                        <GitBranch className={`w-5 h-5 ${mode === 'orchestrated' ? 'text-emerald-400' : 'text-slate-500'}`} />
                        <div>
                          <p className={`text-sm font-semibold ${mode === 'orchestrated' ? 'text-white' : 'text-slate-300'}`}>Standard Pipeline</p>
                          <p className="text-xs text-slate-500 mt-1">Linear execution with validation.</p>
                        </div>
                      </button>
                   </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewTicket(false);
                      setError(null);
                    }}
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 text-sm font-medium flex items-center space-x-2"
                  >
                    {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                    <span>{submitting ? 'Initiating...' : 'Deploy Agent'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    new: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    processing: 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse',
    researching: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 animate-pulse',
    deciding: 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse',
    executing: 'bg-orange-500/10 text-orange-400 border-orange-500/20 animate-pulse',
    validating: 'bg-purple-500/10 text-purple-400 border-purple-500/20 animate-pulse',
    resolved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    escalated: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
      styles[status] || styles['new']
    }`}>
      {status}
    </span>
  );
}
