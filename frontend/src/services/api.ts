import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Ticket endpoints
export async function submitTicket(data: {
  customer_email: string;
  subject: string;
  description: string;
  order_id?: string;
}) {
  const response = await api.post('/tickets/submit', data);
  return response.data;
}

export async function getTicket(ticketId: string) {
  const response = await api.get(`/tickets/${ticketId}`);
  return response.data;
}

export async function listTickets(filters?: {
  status?: string;
  category?: string;
  limit?: number;
  offset?: number;
}) {
  const response = await api.get('/tickets', { params: filters });
  return response.data;
}

// Metrics endpoints
export async function getMetrics() {
  const response = await api.get('/metrics');
  return response.data;
}

export async function getRealtimeMetrics() {
  const response = await api.get('/metrics/realtime');
  return response.data;
}

export async function getTrends(days: number = 30) {
  const response = await api.get('/metrics/trends', { params: { days } });
  return response.data;
}

// Agent endpoints
export async function getAgentStatus() {
  const response = await api.get('/agents/status');
  return response.data;
}

export async function getAgentActivity(limit: number = 20) {
  const response = await api.get('/agents/activity', { params: { limit } });
  return response.data;
}

export default api;
