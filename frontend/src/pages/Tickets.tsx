import { useState } from 'react';
import { Plus } from 'lucide-react';

export default function Tickets() {
  const [showNewTicket, setShowNewTicket] = useState(false);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">Support Tickets</h2>
          <p className="text-slate-400">View and manage support tickets</p>
        </div>
        <button
          onClick={() => setShowNewTicket(true)}
          className="flex items-center space-x-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>New Ticket</span>
        </button>
      </div>

      {/* Tickets List */}
      <div className="bg-slate-800 rounded-lg border border-slate-700">
        <div className="p-6">
          <div className="space-y-4">
            <TicketItem
              id="TKT-A3F2"
              subject="Refund request for damaged item"
              customer="john@example.com"
              status="processing"
              agent="Research Agent"
              time="2 min ago"
            />
            <TicketItem
              id="TKT-B7K9"
              subject="Shipping delay inquiry"
              customer="sarah@example.com"
              status="resolved"
              agent="Execution Agent"
              time="15 min ago"
            />
            <TicketItem
              id="TKT-C1M4"
              subject="Account access issue"
              customer="mike@example.com"
              status="escalated"
              agent="Decision Agent"
              time="1 hour ago"
            />
          </div>
        </div>
      </div>

      {/* New Ticket Modal */}
      {showNewTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg max-w-2xl w-full p-6 border border-slate-700">
            <h3 className="text-2xl font-bold mb-4">Submit New Ticket</h3>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Customer Email</label>
                <input
                  type="email"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
                  placeholder="customer@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Subject</label>
                <input
                  type="text"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
                  placeholder="Brief description of the issue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  rows={4}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
                  placeholder="Detailed description of the issue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Order ID (Optional)</label>
                <input
                  type="text"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
                  placeholder="ORDER-12345"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowNewTicket(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TicketItem({
  id,
  subject,
  customer,
  status,
  agent,
  time,
}: {
  id: string;
  subject: string;
  customer: string;
  status: string;
  agent: string;
  time: string;
}) {
  const statusColors: Record<string, string> = {
    processing: 'bg-blue-500',
    resolved: 'bg-green-500',
    escalated: 'bg-red-500',
  };

  return (
    <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer">
      <div className="flex items-center space-x-4 flex-1">
        <div className={`w-3 h-3 rounded-full ${statusColors[status]}`} />
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-1">
            <span className="font-mono text-sm text-slate-400">{id}</span>
            <span className="text-white font-medium">{subject}</span>
          </div>
          <div className="flex items-center space-x-4 text-sm text-slate-400">
            <span>{customer}</span>
            <span>•</span>
            <span>{agent}</span>
            <span>•</span>
            <span>{time}</span>
          </div>
        </div>
      </div>
      <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${statusColors[status]} bg-opacity-20`}>
        {status}
      </span>
    </div>
  );
}
