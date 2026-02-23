import { Mail, AlertTriangle, CreditCard, Package, Tag } from 'lucide-react';

interface CustomerResponsePreviewProps {
  customerNotification: string;
  actionType: string;
  results: {
    refund_amount?: number;
    tracking_number?: string;
    coupon_code?: string;
  };
  success: boolean;
  customerName?: string;
  ticketSubject?: string;
  isEscalated?: boolean;
  escalationReason?: string;
  compact?: boolean;
}

export default function CustomerResponsePreview({
  customerNotification,
  actionType,
  results,
  success,
  customerName,
  ticketSubject,
  isEscalated,
  escalationReason,
  compact,
}: CustomerResponsePreviewProps) {
  if (isEscalated) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
        <div className="flex items-center space-x-2 text-yellow-400 font-medium mb-2">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm">Escalated to Human Agent</span>
        </div>
        {escalationReason && (
          <p className="text-sm text-slate-400">{escalationReason}</p>
        )}
      </div>
    );
  }

  if (!customerNotification && !success) return null;

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
      {!compact && (
        <div className="bg-slate-900/50 px-4 py-3 border-b border-slate-700">
          <div className="flex items-center space-x-2 text-slate-300">
            <Mail className="w-4 h-4" />
            <span className="text-sm font-medium">Customer Notification</span>
            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs capitalize ml-auto">
              {actionType?.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
      )}
      <div className={compact ? 'p-4 space-y-2' : 'p-4 space-y-3'}>
        {!compact && (
          <>
            <div className="text-sm text-slate-500">
              To: <span className="text-slate-300">{customerName || 'Customer'}</span>
            </div>
            {ticketSubject && (
              <div className="text-sm text-slate-500">
                Re: <span className="text-slate-300">{ticketSubject}</span>
              </div>
            )}
            <hr className="border-slate-700" />
          </>
        )}

        {compact && (
          <div className="flex items-center space-x-2 text-slate-300 mb-1">
            <Mail className="w-3.5 h-3.5" />
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Customer Response</span>
          </div>
        )}

        {customerNotification && (
          <p className={`text-slate-300 leading-relaxed ${compact ? 'text-xs' : 'text-sm'}`}>
            {customerNotification}
          </p>
        )}

        {(results.refund_amount || results.tracking_number || results.coupon_code) && (
          <div className="flex flex-wrap gap-2 pt-1">
            {results.refund_amount != null && (
              <span className="flex items-center space-x-1 px-2 py-1 bg-green-500/10 text-green-400 rounded text-xs">
                <CreditCard className="w-3 h-3" />
                <span>Refund: ${results.refund_amount}</span>
              </span>
            )}
            {results.tracking_number && (
              <span className="flex items-center space-x-1 px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-xs">
                <Package className="w-3 h-3" />
                <span>Tracking: {results.tracking_number}</span>
              </span>
            )}
            {results.coupon_code && (
              <span className="flex items-center space-x-1 px-2 py-1 bg-purple-500/10 text-purple-400 rounded text-xs">
                <Tag className="w-3 h-3" />
                <span>Coupon: {results.coupon_code}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
