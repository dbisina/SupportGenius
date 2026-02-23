interface SentimentBannerProps {
  sentiment: string;
  priority: string;
  category: string;
  confidence: number;
  customerName?: string;
  isVip?: boolean;
  lifetimeValue?: number;
}

const SENTIMENT_STYLES: Record<string, { label: string; classes: string }> = {
  positive: { label: 'Positive', classes: 'bg-green-500/20 text-green-400 border-green-500/30' },
  neutral: { label: 'Neutral', classes: 'bg-slate-600/50 text-slate-300 border-slate-500/30' },
  negative: { label: 'Frustrated', classes: 'bg-red-500/20 text-red-400 border-red-500/30' },
  angry: { label: 'Angry', classes: 'bg-red-600/30 text-red-300 border-red-500/50 animate-pulse' },
};

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'bg-red-500/20 text-red-400',
  high: 'bg-orange-500/20 text-orange-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  low: 'bg-slate-600/50 text-slate-400',
};

export default function SentimentBanner({
  sentiment,
  priority,
  category,
  confidence,
  customerName,
  isVip,
  lifetimeValue,
}: SentimentBannerProps) {
  const sentimentStyle = SENTIMENT_STYLES[sentiment] || SENTIMENT_STYLES.neutral;
  const priorityStyle = PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium;

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center space-x-3">
        <span className={`px-3 py-1.5 rounded-lg border text-sm font-semibold ${sentimentStyle.classes}`}>
          {sentimentStyle.label}
        </span>
        <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${priorityStyle}`}>
          {priority} priority
        </span>
        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs capitalize">
          {category?.replace(/_/g, ' ')}
        </span>
        <span className="text-xs text-slate-500">
          {((confidence || 0) * 100).toFixed(0)}% confidence
        </span>
      </div>
      <div className="flex items-center space-x-3 text-sm">
        {customerName && <span className="text-slate-300">{customerName}</span>}
        {isVip && (
          <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs font-medium">
            VIP
          </span>
        )}
        {lifetimeValue != null && lifetimeValue > 0 && (
          <span className="text-slate-400">LTV: ${lifetimeValue.toLocaleString()}</span>
        )}
      </div>
    </div>
  );
}
