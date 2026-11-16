import api from "../axiosInstance";

// Workstream B R4.1 (Monitoring). All four endpoints below are read-only --
// nothing here ever writes to a message, financial, or evidence table.

export interface CollectorStatusEntry {
  status?: string; // "ok" | "failed"
  last_success?: string;
  last_failure?: string;
  error?: string;
  generation_ms?: string;
}

export interface ConsumerGroupStreamHealth {
  status: string; // HEALTHY | DEGRADED | STALLED | IDLE | UNKNOWN | MONITORING_UNAVAILABLE
  detail?: string;
  pending?: number | null;
  lag?: number | null;
  entries_read?: number | null;
  oldest_pending_age_s?: number | null;
  last_generated_id?: string | null;
  last_delivered_id?: string | null;
}

export interface ConsumerGroupHealthPayload {
  generated_at: string;
  streams: Record<string, ConsumerGroupStreamHealth>;
  generation_ms?: number;
}

export interface DeadLetterHealthPayload {
  generated_at: string;
  retained_count: number;
  last_observed_id: string | null;
  newly_visible_entries: number | null;
  continuity_ok: boolean | null;
}

export interface ReliabilityOverviewResponse {
  collector_status: Record<string, CollectorStatusEntry> | null;
  consumer_group_health: ConsumerGroupHealthPayload | null;
  dead_letter_health: DeadLetterHealthPayload | null;
}

export const getReliabilityOverviewApi = async (): Promise<ReliabilityOverviewResponse> => {
  const response = await api.get(`/server/reliability_overview/`);
  return response.data;
};

export interface PagedResult<T> {
  page: number;
  page_size: number;
  total: number;
  results: T[];
}

export type EvidenceSource =
  | "unmatched_resp"
  | "unmatched_dlr"
  | "protocol_conflict"
  | "dlr_conflict"
  | "deadletter_inbound";

export const getReliabilityEvidenceApi = async (
  source: EvidenceSource,
  page: number = 1,
  pageSize: number = 25,
  status?: string,
): Promise<PagedResult<any>> => {
  const params: Record<string, any> = { source, page, page_size: pageSize };
  if (status) params.status = status;
  const response = await api.get(`/reliabilityEvidenceCenter/`, { params });
  return response.data;
};

export const getFinancialReviewApi = async (
  page: number = 1,
  pageSize: number = 25,
  status: string = "FINANCIAL_REVIEW_PENDING",
): Promise<PagedResult<any> & { status_filter: string }> => {
  const response = await api.get(`/financialReviewCenter/`, {
    params: { page, page_size: pageSize, status },
  });
  return response.data;
};

export interface MessageLifecycleResponse {
  message: Record<string, any>;
  // F-R4.1-11: true when the requesting role has no Financial Review Center
  // access -- terminal_failures is then redacted to [] server-side.
  financial_review_restricted: boolean;
  parts: any[];
  attempts: any[];
  dlr_events: any[];
  protocol_outcome_conflicts: any[];
  dlr_conflicts: any[];
  terminal_failures: any[];
}

export const getMessageLifecycleApi = async (
  messageRef: string,
): Promise<MessageLifecycleResponse> => {
  const response = await api.get(
    `/messageLifecycleExplorer/${encodeURIComponent(messageRef)}/`,
  );
  return response.data;
};

// Workstream B R4.2 (Critical-alert detection). Reads AlertEvent directly --
// an open incident stays visible here even if its own Notification/
// WebSocket delivery failed.
export interface OperationalAlertRow {
  id: number;
  event_type: string;
  category: string;
  severity: "WARNING" | "CRITICAL";
  subject_ref: string;
  message: string;
  status: "OPEN" | "ACKNOWLEDGED" | "INVESTIGATING" | "RESOLVED";
  first_detected_at: string;
  last_detected_at: string;
  occurrence_count: number;
  resolved_at: string | null;
  // true when this row's detail was redacted because the viewer has no
  // Financial Review Center access (same boundary as message_lifecycle's
  // terminal_failures redaction).
  financial_review_restricted: boolean;
  assigned_to_id: number | null;
  assigned_to_username: string | null;
}

export const getOperationalAlertsApi = async (
  page: number = 1,
  pageSize: number = 25,
  status?: string,
  severity?: string,
): Promise<PagedResult<OperationalAlertRow> & { status_filter: string; severity_filter: string }> => {
  const params: Record<string, any> = { page, page_size: pageSize };
  if (status) params.status = status;
  if (severity) params.severity = severity;
  const response = await api.get(`/operationalAlerts/`, { params });
  return response.data;
};

// Workstream B R4.3 (acknowledgment + ownership). Scoped deliberately --
// no investigation notes as a separate feature, no escalation timers, no
// role-based/email routing, no manual resolution (status only ever moves
// OPEN->ACKNOWLEDGED here; RESOLVED stays exclusively automatic).

export interface AssignableUser {
  id: number;
  username: string;
}

export const getAssignableUsersApi = async (): Promise<{ results: AssignableUser[] }> => {
  const response = await api.get(`/operationalAlerts/assignable_users/`);
  return response.data;
};

export interface AlertAcknowledgmentRow {
  id: number;
  acknowledged_by: string | null;
  acknowledged_at: string;
  note: string;
}

export const getAlertAcknowledgmentsApi = async (
  alertId: number,
): Promise<{ results: AlertAcknowledgmentRow[] }> => {
  const response = await api.get(`/operationalAlerts/${alertId}/acknowledgments/`);
  return response.data;
};

export const acknowledgeAlertApi = async (
  alertId: number,
  data: { note?: string; assign_to?: number },
): Promise<{ id: number; status: string; assigned_to_id: number; assigned_to_username: string }> => {
  const response = await api.post(`/operationalAlerts/${alertId}/acknowledge/`, data);
  return response.data;
};
