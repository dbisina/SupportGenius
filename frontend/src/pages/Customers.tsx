import { useState, useEffect } from 'react';
import { Users, Search, Crown, ShoppingBag, Clock, Mail } from 'lucide-react';
import { listCustomers } from '../services/api';

interface Customer {
  customer_id: string;
  name: string;
  email: string;
  lifetime_value: number;
  total_orders: number;
  total_returns: number;
  avg_order_value: number;
  vip_status: boolean;
  support_tickets_count: number;
  last_order_date: string;
  created_at: string;
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [vipFilter, setVipFilter] = useState<string>('');

  useEffect(() => {
    loadCustomers();
  }, [vipFilter]);

  const loadCustomers = async (searchQuery?: string) => {
    try {
      setLoading(true);
      const data = await listCustomers({ vip: vipFilter || undefined, search: searchQuery || undefined, limit: 100 });
      setCustomers(data.customers || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadCustomers(search);
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffDays = Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 1) return 'Today';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  };

  const getLTVTier = (ltv: number) => {
    if (ltv >= 10000) return { label: 'Platinum', color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' };
    if (ltv >= 5000) return { label: 'Gold', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
    if (ltv >= 2000) return { label: 'Silver', color: 'text-slate-300', bg: 'bg-slate-500/10', border: 'border-slate-500/20' };
    return { label: 'Standard', color: 'text-slate-500', bg: 'bg-slate-800/50', border: 'border-slate-700/30' };
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="text-4xl font-bold tracking-tight text-white mb-2">Customer Directory</h2>
          <p className="text-slate-400">
            {total} customer profiles in Elasticsearch
            <span className="ml-2 text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
              Real-time
            </span>
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="hidden md:flex items-center px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-sm text-slate-300 backdrop-blur-md shadow-inner">
            <Users className="w-4 h-4 mr-2 text-indigo-400" />
            {total} Profiles
          </div>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="glass-panel p-3 rounded-xl flex flex-col md:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex items-center space-x-2 px-2">
          <Search className="w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search customers by name, email, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-white placeholder-slate-500 w-full outline-none"
          />
        </form>
        <div className="flex items-center space-x-2 px-2">
          <button
            onClick={() => setVipFilter('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              !vipFilter ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setVipFilter(vipFilter === 'true' ? '' : 'true')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center space-x-1 ${
              vipFilter === 'true' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-500 hover:text-white hover:bg-white/5'
            }`}
          >
            <Crown className="w-3 h-3" />
            <span>VIP Only</span>
          </button>
        </div>
      </div>

      {/* Customer Table */}
      <div className="glass-panel rounded-2xl overflow-hidden min-h-[600px] flex flex-col">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 bg-white/[0.02] text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <div className="col-span-3">Customer</div>
          <div className="col-span-2">Tier</div>
          <div className="col-span-2 text-right">Lifetime Value</div>
          <div className="col-span-1 text-center">Orders</div>
          <div className="col-span-1 text-center">Returns</div>
          <div className="col-span-1 text-center">Tickets</div>
          <div className="col-span-2 text-right">Last Order</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-white/5 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500">
              <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mb-4" />
              <p>Loading customer profiles...</p>
            </div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500">
              <Users className="w-12 h-12 mb-4 opacity-30" />
              <p>No customers found</p>
            </div>
          ) : (
            customers.map((customer) => {
              const tier = getLTVTier(customer.lifetime_value);
              return (
                <div
                  key={customer.customer_id}
                  className="grid grid-cols-12 gap-4 p-4 hover:bg-white/[0.04] transition-colors group items-center"
                >
                  {/* Customer Info */}
                  <div className="col-span-3 flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-lg ${
                      customer.vip_status
                        ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white'
                        : 'bg-gradient-to-br from-slate-700 to-slate-800 text-slate-300'
                    }`}>
                      {customer.name?.charAt(0) || 'C'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-white truncate group-hover:text-indigo-300 transition-colors">
                          {customer.name}
                        </p>
                        {customer.vip_status && <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                      </div>
                      <div className="flex items-center space-x-1 text-xs text-slate-500 truncate">
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tier */}
                  <div className="col-span-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${tier.bg} ${tier.color} ${tier.border}`}>
                      {tier.label}
                    </span>
                  </div>

                  {/* LTV */}
                  <div className="col-span-2 text-right">
                    <span className="text-lg font-bold font-mono text-emerald-400">${customer.lifetime_value.toLocaleString()}</span>
                  </div>

                  {/* Orders */}
                  <div className="col-span-1 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <ShoppingBag className="w-3 h-3 text-blue-400" />
                      <span className="text-sm font-mono text-white">{customer.total_orders}</span>
                    </div>
                  </div>

                  {/* Returns */}
                  <div className="col-span-1 text-center">
                    <span className={`text-sm font-mono ${customer.total_returns > 3 ? 'text-red-400' : 'text-slate-400'}`}>
                      {customer.total_returns}
                    </span>
                  </div>

                  {/* Support Tickets */}
                  <div className="col-span-1 text-center">
                    <span className="text-sm font-mono text-slate-400">{customer.support_tickets_count}</span>
                  </div>

                  {/* Last Order */}
                  <div className="col-span-2 text-right">
                    <div className="flex items-center justify-end space-x-1 text-xs text-slate-500">
                      <Clock className="w-3 h-3" />
                      <span>{getTimeAgo(customer.last_order_date)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Summary Stats */}
      {!loading && customers.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total LTV"
            value={`$${customers.reduce((s, c) => s + c.lifetime_value, 0).toLocaleString()}`}
            color="text-emerald-400"
          />
          <StatCard
            label="VIP Customers"
            value={customers.filter(c => c.vip_status).length.toString()}
            color="text-amber-400"
          />
          <StatCard
            label="Avg Order Value"
            value={`$${Math.round(customers.reduce((s, c) => s + c.avg_order_value, 0) / customers.length)}`}
            color="text-blue-400"
          />
          <StatCard
            label="Avg Orders"
            value={Math.round(customers.reduce((s, c) => s + c.total_orders, 0) / customers.length).toString()}
            color="text-purple-400"
          />
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="glass-panel rounded-2xl p-5 relative overflow-hidden group hover:border-white/10 transition-all">
      <div className="relative z-10">
        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">{label}</p>
        <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
      </div>
    </div>
  );
}
