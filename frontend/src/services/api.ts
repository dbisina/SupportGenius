import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

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
  mode?: 'orchestrated' | 'autonomous';
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

// Pipeline trace endpoint
export async function getTicketTrace(ticketId: string) {
  const response = await api.get(`/tickets/${ticketId}/trace`);
  return response.data;
}

// Incident detection endpoint
export async function detectIncidents() {
  const response = await api.get('/incidents/detect');
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

// Knowledge Flywheel
export async function getKnowledgeStats() {
  const response = await api.get('/metrics/knowledge');
  return response.data;
}

// ES|QL Queries
export async function getEsqlQueries(limit: number = 20) {
  const response = await api.get('/metrics/esql-queries', { params: { limit } });
  return response.data;
}

// Flywheel data
export async function getFlywheelData(days: number = 30) {
  const response = await api.get('/metrics/flywheel', { params: { days } });
  return response.data;
}

// Create incident
export async function createIncident(data: { keyword_cluster: string; affected_tickets: string[]; severity: string }) {
  const response = await api.post('/incidents/create', data);
  return response.data;
}

// Impact metrics
export async function getImpactMetrics() {
  const response = await api.get('/metrics/impact');
  return response.data;
}

// Products
export async function listProducts(filters?: { category?: string; search?: string; limit?: number; offset?: number }) {
  const response = await api.get('/products', { params: filters });
  return response.data;
}

export async function getProduct(productId: string) {
  const response = await api.get(`/products/${productId}`);
  return response.data;
}

// Customers
export async function listCustomers(filters?: { vip?: string; search?: string; limit?: number; offset?: number }) {
  const response = await api.get('/customers', { params: filters });
  return response.data;
}

export async function getCustomer(customerId: string) {
  const response = await api.get(`/customers/${customerId}`);
  return response.data;
}

export default api;
