/**
 * Tipuri TypeScript stricte - înlocuiește toate `any`-urile din aplicație
 */

import type { LucideIcon } from 'lucide-react';

// ============= ERROR HANDLING =============
export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  statusCode?: number;
}

export interface SupabaseError {
  message: string;
  details: string;
  hint: string;
  code: string;
}

// ============= CHAT & CONVERSATION =============
export interface MessageMetadata {
  type?: 'fiscal' | 'balance' | 'strategic';
  sources?: MessageSource[];
  related_questions?: string[];
  structuredData?: StructuredBalanceData;
  company_id?: string;
  analysis_id?: string;
}

export interface MessageSource {
  title: string;
  url: string;
  domain: string;
}

export interface StructuredBalanceData {
  cui: string;
  company: string;
  period?: string;  // 🆕 Perioada balanței (ex: "Decembrie 2024")
  accounts: BalanceAccount[];
}

export interface BalanceAccount {
  code: string;
  name: string;
  debit: number;           // Total sume debitoare (pentru clasa 6-7)
  credit: number;          // Total sume creditoare (pentru clasa 6-7)
  finalDebit?: number;     // 🆕 Sold final debitor (pentru clasa 1-5)
  finalCredit?: number;    // 🆕 Sold final creditor (pentru clasa 1-5)
  accountClass: number;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  conversation_id: string;
  metadata?: MessageMetadata;
  feedbackGiven?: boolean;
}

// ============= RESEARCH & ACADEMIC =============
export interface TheoreticalFramework {
  name: string;
  authors: string[];
  year: number;
  description: string;
  relevance: string;
}

export interface CaseStudy {
  title: string;
  context: string;
  findings: string;
  source: string;
}

export interface MetricsCollected {
  statistical_data: StatisticalDataPoint[];
  video_resources: VideoResource[];
  citations: Citation[];
}

export interface StatisticalDataPoint {
  indicator: string;
  value: number | string;
  year: number;
  source: string;
}

export interface VideoResource {
  title: string;
  url: string;
  description: string;
  relevance: string;
}

export interface Citation {
  authors: string;
  year: number;
  title: string;
  journal?: string;
  doi?: string;
  url?: string;
}

export interface ResearchData {
  theoretical_frameworks: TheoreticalFramework[];
  case_studies: CaseStudy[];
  metrics_collected: MetricsCollected;
}

// ============= ANALYSIS & VALIDATION =============
export interface AnalysisMetadata {
  company_name?: string;
  cui?: string;
  period?: string;
  total_debit?: number;
  total_credit?: number;
  balance_status?: 'balanced' | 'unbalanced';
  analysis_date?: string;
  validation_status?: 'pending' | 'validated' | 'failed';
  grok_validation?: GrokValidation;
  class6_Expenses?: BalanceAccount[];
  class7_Revenue?: BalanceAccount[];
  [key: string]: unknown;
}

export interface GrokValidation {
  anomalies: Anomaly[];
  recommendations: string[];
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
}

export interface Anomaly {
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  category: string;
  description: string;
  affected_accounts?: string[];
  recommendation?: string;
}

// ============= COMPANY & CLIENT =============
export interface CompanyData {
  id: string;
  company_name: string;
  cui?: string;
  cif?: string;
  address?: string;
  contact_person?: string;
  contact_email?: string;
  phone?: string;
  tax_type?: 'micro' | 'profit' | 'income';
  vat_payer?: boolean;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientVerificationFindings {
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  findings: VerificationFinding[];
  metadata?: Record<string, unknown>;
}

export interface VerificationFinding {
  type: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  details?: unknown;
}

// ============= UI COMPONENTS =============
export interface IconProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  className?: string;
}

export interface BadgeVariant {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
}

export interface StatusMapping {
  [key: string]: BadgeVariant;
}

// ============= ATTACHMENTS & FILES =============
export interface FileAttachment {
  name: string;
  size: number;
  type: string;
  url?: string;
  path?: string;
}

export interface MessageAttachment {
  file_name: string;
  file_path: string;
  file_size: number;
  uploaded_at: string;
}

// ============= CREDITS & PAYMENTS =============
export interface CreditsPurchaseMetadata {
  package_name: string;
  credits_amount: number;
  price_cents: number;
  stripe_session_id?: string;
  stripe_payment_intent_id?: string;
}

export interface SubscriptionMetadata {
  subscription_type: 'free' | 'premium' | 'pro' | 'enterprise';
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  trial_ends_at?: string;
  subscription_ends_at?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
}

// ============= TASK MANAGEMENT =============
export interface TaskAttachment {
  name: string;
  url: string;
  size: number;
}

export interface TaskTags {
  tags: string[];
}

export interface TaskData {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  task_type?: string;
  due_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  assigned_by: string;
  assigned_to: string;
  company_id?: string;
  attachments?: TaskAttachment[];
  tags?: TaskTags;
  created_at: string;
  updated_at: string;
}

// ============= UTILITY TYPES =============
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export type RecordValue<T> = T[keyof T];
