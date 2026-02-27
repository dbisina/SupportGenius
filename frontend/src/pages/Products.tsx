import { useState, useEffect } from 'react';
import { Package, Search, Tag, Shield, AlertTriangle, ChevronRight, TrendingUp } from 'lucide-react';
import { listProducts } from '../services/api';

interface Product {
  product_id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  common_issues: string[];
  return_policy_days: number;
  warranty_months: number;
  defect_rate: number;
  in_stock: boolean;
  stock_quantity: number;
  tags: string[];
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Electronics': { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  'Clothing': { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20' },
  'Home & Kitchen': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  'Sports': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
};

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, [category]);

  const loadProducts = async (searchQuery?: string) => {
    try {
      setLoading(true);
      const data = await listProducts({ category: category || undefined, search: searchQuery || undefined, limit: 100 });
      setProducts(data.products || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadProducts(search);
  };

  const categories = ['Electronics', 'Clothing', 'Home & Kitchen', 'Sports'];

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="text-4xl font-bold tracking-tight text-white mb-2">Product Catalog</h2>
          <p className="text-slate-400">
            {total} products indexed in Elasticsearch
            <span className="ml-2 text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
              Real-time
            </span>
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="hidden md:flex items-center px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-sm text-slate-300 backdrop-blur-md shadow-inner">
            <Package className="w-4 h-4 mr-2 text-indigo-400" />
            {total} Items
          </div>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="glass-panel p-3 rounded-xl flex flex-col md:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex items-center space-x-2 px-2">
          <Search className="w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-white placeholder-slate-500 w-full outline-none"
          />
        </form>
        <div className="flex items-center space-x-2 px-2">
          <button
            onClick={() => setCategory('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              !category ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'
            }`}
          >
            All
          </button>
          {categories.map((cat) => {
            const style = CATEGORY_COLORS[cat] || CATEGORY_COLORS['Electronics'];
            return (
              <button
                key={cat}
                onClick={() => setCategory(cat === category ? '' : cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  category === cat ? `${style.bg} ${style.text} border ${style.border}` : 'text-slate-500 hover:text-white hover:bg-white/5'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="glass-panel rounded-2xl p-6 animate-pulse">
              <div className="h-4 bg-slate-700 rounded w-3/4 mb-4" />
              <div className="h-3 bg-slate-800 rounded w-1/2 mb-6" />
              <div className="h-20 bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => {
            const style = CATEGORY_COLORS[product.category] || CATEGORY_COLORS['Electronics'];
            const isExpanded = expanded === product.product_id;
            return (
              <div
                key={product.product_id}
                onClick={() => setExpanded(isExpanded ? null : product.product_id)}
                className={`glass-panel rounded-2xl p-6 relative overflow-hidden group hover:border-white/10 transition-all duration-300 cursor-pointer ${isExpanded ? 'ring-1 ring-indigo-500/30' : ''}`}
              >
                {/* Decorative glow */}
                <div className={`absolute -top-4 -right-4 w-24 h-24 ${style.bg} blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                <div className="relative z-10">
                  {/* Category + Stock */}
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${style.bg} ${style.text} ${style.border}`}>
                      {product.category}
                    </span>
                    <span className={`flex items-center text-[10px] font-bold uppercase tracking-wider ${product.in_stock ? 'text-emerald-400' : 'text-red-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1 ${product.in_stock ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      {product.in_stock ? `${product.stock_quantity} in stock` : 'Out of Stock'}
                    </span>
                  </div>

                  {/* Name + Price */}
                  <h3 className="text-lg font-bold text-white mb-1 group-hover:text-indigo-300 transition-colors">{product.name}</h3>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl font-bold text-indigo-400 font-mono">${product.price.toFixed(2)}</span>
                    <span className="text-xs text-slate-500 font-mono">{product.product_id}</span>
                  </div>

                  {/* Description */}
                  <p className={`text-xs text-slate-400 leading-relaxed mb-4 ${isExpanded ? '' : 'line-clamp-2'}`}>
                    {product.description}
                  </p>

                  {/* Meta Badges */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <div className="flex items-center space-x-1 text-[10px] text-slate-500 bg-white/5 px-2 py-1 rounded-lg">
                      <Shield className="w-3 h-3" />
                      <span>{product.warranty_months}mo warranty</span>
                    </div>
                    <div className="flex items-center space-x-1 text-[10px] text-slate-500 bg-white/5 px-2 py-1 rounded-lg">
                      <Tag className="w-3 h-3" />
                      <span>{product.return_policy_days}d returns</span>
                    </div>
                    <div className={`flex items-center space-x-1 text-[10px] px-2 py-1 rounded-lg ${
                      product.defect_rate > 0.03 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      <TrendingUp className="w-3 h-3" />
                      <span>{(product.defect_rate * 100).toFixed(1)}% defect</span>
                    </div>
                  </div>

                  {/* Known Issues (expanded) */}
                  {isExpanded && product.common_issues?.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/5 animate-fade-in">
                      <div className="flex items-center space-x-2 mb-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Known Issues</span>
                      </div>
                      <div className="space-y-1.5">
                        {product.common_issues.map((issue, i) => (
                          <div key={i} className="flex items-start space-x-2 text-xs text-slate-400">
                            <ChevronRight className="w-3 h-3 text-amber-500/50 mt-0.5 flex-shrink-0" />
                            <span>{issue}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {products.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-24 text-slate-500">
          <Package className="w-12 h-12 mb-4 opacity-30" />
          <p>No products found</p>
        </div>
      )}
    </div>
  );
}
