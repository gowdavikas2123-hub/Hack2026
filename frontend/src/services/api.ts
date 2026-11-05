import {
  Batch,
  CustomerRequest,
  PartCatalogueItem,
  ToolCallLog,
  EvidenceItem,
  HumanReviewRecord,
  SpendingSummary
} from '../types';

const API_BASE = typeof window !== 'undefined' && window.location.port === '5173' ? 'http://127.0.0.1:8000' : '';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    let errorDetail = res.statusText;
    try {
      const errObj = await res.json();
      errorDetail = errObj.detail || errObj.message || JSON.stringify(errObj);
    } catch (e) {
      // ignore
    }
    throw new Error(errorDetail || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Scenario & Health
  getHealth: () => fetchJson<{ status: string; llm_mode: string; tool_mode: string }>('/api/health'),
  getScenario: () => fetchJson<any>('/api/scenario'),
  resetScenario: () => fetchJson<{ batch_id: string; status: string }>('/api/scenario/reset', { method: 'POST' }),

  // Batches
  getBatches: () => fetchJson<Batch[]>('/api/batches'),
  getBatch: (batchId: string) => fetchJson<Batch>(`/api/batches/${batchId}`),
  runBatch: (batchId: string) => fetchJson<Batch>(`/api/batches/${batchId}/run`, { method: 'POST' }),
  pauseBatch: (batchId: string) => fetchJson<any>(`/api/batches/${batchId}/pause`, { method: 'POST' }),
  resumeBatch: (batchId: string) => fetchJson<Batch>(`/api/batches/${batchId}/resume`, { method: 'POST' }),

  // Catalogue
  getCatalogue: () => fetchJson<PartCatalogueItem[]>('/api/catalogue'),
  getPart: (partId: string) => fetchJson<PartCatalogueItem>(`/api/catalogue/${partId}`),

  // Requests
  getBatchRequests: (batchId: string) => fetchJson<CustomerRequest[]>(`/api/batches/${batchId}/requests`),
  getRequest: (requestId: string) => fetchJson<CustomerRequest>(`/api/requests/${requestId}`),
  getRequestHistory: () => fetchJson<CustomerRequest[]>('/api/requests/history'),
  submitCustomerRequest: (payload: { message: string; customer_name?: string; batch_id?: string }) =>
    fetchJson<CustomerRequest>('/api/requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Audit & Analytics
  getBatchAudit: (batchId: string) => fetchJson<any>(`/api/batches/${batchId}/audit`),
  getBatchEvidence: (batchId: string) => fetchJson<EvidenceItem[]>(`/api/batches/${batchId}/evidence`),
  getBatchSpending: (batchId: string) => fetchJson<SpendingSummary>(`/api/batches/${batchId}/spending`),
  getToolLogs: (batchId: string) => fetchJson<ToolCallLog[]>(`/api/batches/${batchId}/tool-logs`),
  getDispatches: (batchId: string) => fetchJson<any[]>(`/api/batches/${batchId}/dispatches`),

  // Human Review
  getHumanReview: (batchId: string) => fetchJson<HumanReviewRecord[]>(`/api/batches/${batchId}/human-review`),
  resolveHumanReview: (requestId: string, payload: { action: string; part_id?: string; operator_name?: string; notes?: string }) =>
    fetchJson<any>(`/api/requests/${requestId}/resolve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Chatbot
  sendChatMessage: (message: string, batchId: string = 'BATCH-001') =>
    fetchJson<{ reply: string; batch_id: string; timestamp: string }>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message, batch_id: batchId }),
    }),
};
