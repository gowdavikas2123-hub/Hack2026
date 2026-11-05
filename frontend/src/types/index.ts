export interface Batch {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED';
  total_requests: number;
  processed_requests: number;
  dispatched_requests: number;
  human_review_requests: number;
  pending_requests: number;
  total_tool_calls: number;
  inspection_calls: number;
  clarification_calls: number;
  verification_calls: number;
  dispatch_calls: number;
  llm_input_tokens: number;
  llm_output_tokens: number;
  known_llm_spending: number;
  known_tool_spending: number;
  total_spending: number;
  total_spending_inr?: number;
  budget_limit: number;
  budget_limit_inr?: number;
  remaining_budget: number;
  remaining_budget_inr?: number;
  tool_units_budget?: number;
  tool_units_spent?: number;
  tool_units_remaining?: number;
  total_actions_count?: number;
  max_actions_limit?: number;
  unpriced_operations: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerRequest {
  id: string;
  customer_name: string;
  original_message: string;
  updated_message?: string;
  part_type?: string;
  extracted_voltage?: number;
  voltage_unit?: string;
  extracted_connector?: string;
  extracted_min_wattage?: number;
  wattage_unit?: string;
  missing_fields: string[];
  status: 'PENDING' | 'PROCESSING' | 'CLARIFICATION_REQUIRED' | 'STOCK_CHECK' | 'DISPATCHED' | 'HUMAN_REVIEW' | 'FAILED';
  final_outcome?: 'DISPATCH' | 'HUMAN_REVIEW';
  selected_part_id?: string;
  outcome_reason?: string;
  cost_inr?: number;
  cost_usd?: number;
  created_at?: string;
}

export interface PartCatalogueItem {
  id: string;
  name: string;
  voltage: number;
  connector: string;
  wattage: number;
  technical_description: string;
  compatibility_notes?: string;
  snapshot_quantity: number;
  snapshot_freshness: 'RECENT' | 'AGED';
  verified_quantity?: number;
  current_stock: number;
  has_discrepancy: boolean;
  discrepancy_type?: 'OVERSTATED' | 'UNDERSTATED';
}

export interface ToolCallLog {
  id: number;
  batch_id: string;
  request_id?: string;
  tool_name: string;
  part_id?: string;
  input_payload?: string;
  output_payload?: string;
  status: 'SUCCESS' | 'FAILED';
  error_message?: string;
  cost: number;
  execution_time_ms: number;
  created_at: string;
}

export interface EvidenceItem {
  id: number;
  request_id: string;
  source_type: string;
  source_reference?: string;
  evidence_text: string;
  interpretation?: string;
  created_at: string;
}

export interface HumanReviewRecord {
  id: number;
  request_id: string;
  reason: string;
  missing_info?: string;
  failed_checks?: string;
  stock_issues?: string;
  tool_failures?: string;
  recommended_action: string;
  status: 'PENDING_HUMAN_ACTION' | 'RESOLVED_DISPATCHED' | 'RESOLVED_CANCELLED';
  resolution_notes?: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

export interface SpendingSummary {
  batch_id: string;
  total_llm_input_tokens: number;
  total_llm_output_tokens: number;
  known_llm_spending: number;
  known_tool_spending: number;
  total_known_spending: number;
  total_spending_inr?: number;
  unpriced_operations: number;
  budget_limit: number;
  budget_limit_inr?: number;
  remaining_budget: number;
  remaining_budget_inr?: number;
  tool_units_budget?: number;
  tool_units_spent?: number;
  tool_units_remaining?: number;
  total_actions_count?: number;
  max_actions_limit?: number;
  breakdown_by_category: Record<string, number>;
}
