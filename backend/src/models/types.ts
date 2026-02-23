// Ticket related types
export interface SupportTicket {
  ticket_id: string;
  customer_id: string;
  order_id?: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  resolution?: string;
  resolution_time_minutes?: number;
  automated: boolean;
  agent_confidence: number;
  created_at: Date;
  resolved_at?: Date;
}

export type TicketCategory =
  | 'refund'
  | 'shipping'
  | 'product_issue'
  | 'account'
  | 'other';

export type TicketPriority = 'urgent' | 'high' | 'medium' | 'low';

export type TicketStatus =
  | 'new'
  | 'processing'
  | 'researching'
  | 'deciding'
  | 'executing'
  | 'validating'
  | 'resolved'
  | 'escalated';

// Customer related types
export interface CustomerProfile {
  customer_id: string;
  email: string;
  name: string;
  lifetime_value: number;
  total_orders: number;
  total_returns: number;
  avg_order_value: number;
  last_order_date: Date;
  support_tickets_count: number;
  vip_status: boolean;
  order_history: Order[];
}

export interface Order {
  order_id: string;
  date: Date;
  total: number;
  status: OrderStatus;
  items?: OrderItem[];
}

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export interface OrderItem {
  product_id: string;
  name: string;
  quantity: number;
  price: number;
}

// Product related types
export interface Product {
  product_id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  common_issues: string[];
  return_policy_days: number;
  warranty_months: number;
  defect_rate: number;
}

// Knowledge base types
export interface KnowledgeArticle {
  article_id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  helpful_count: number;
  last_updated: Date;
}

// Resolution action types
export interface ResolutionAction {
  action_id: string;
  action_type: ActionType;
  workflow_template: any;
  success_rate: number;
  avg_execution_time: number;
  conditions: string;
  parameters: Record<string, any>;
}

export type ActionType =
  | 'refund'
  | 'exchange'
  | 'shipping_label'
  | 'escalate'
  | 'email_notification'
  | 'account_update';

// Agent related types
export interface AgentResult {
  agent_name: string;
  confidence: number;
  decision: string;
  data?: any;
  next_agent?: string;
  timestamp: Date;
}

export interface TriageResult extends AgentResult {
  category: TicketCategory;
  priority: TicketPriority;
  extracted_entities: {
    customer_id?: string;
    order_id?: string;
    product_id?: string;
  };
}

export interface ResearchResult extends AgentResult {
  customer_profile?: CustomerProfile;
  similar_tickets: SupportTicket[];
  relevant_articles: KnowledgeArticle[];
  product_info?: Product;
}

export interface DecisionResult extends AgentResult {
  resolution_path: string;
  action_type: ActionType;
  should_escalate: boolean;
  escalation_reason?: string;
  calculated_amount?: number;
}

export interface ExecutionResult extends AgentResult {
  action_executed: ActionType;
  execution_details: any;
  success: boolean;
  error?: string;
}

export interface QualityResult extends AgentResult {
  validation_passed: boolean;
  feedback: string;
  improvements: string[];
}

// API Request/Response types
export interface SubmitTicketRequest {
  customer_email: string;
  subject: string;
  description: string;
  order_id?: string;
}

export interface SubmitTicketResponse {
  ticket_id: string;
  status: TicketStatus;
  estimated_resolution: string;
  agent_assigned: string;
}

export interface MetricsResponse {
  total_tickets: number;
  automated_tickets: number;
  automation_rate: number;
  avg_resolution_time: number;
  customer_satisfaction: number;
  cost_savings: number;
  by_category: Record<TicketCategory, number>;
  by_status: Record<TicketStatus, number>;
}
