// ======================
// Lambda Related Types
// ======================
interface LambdaEvent {
  httpMethod: string;
  body: string;
}

interface LambdaResponse {
  statusCode: number;
  headers: Record<string, string | boolean>;
  body: string;
}

interface RequestBody {
  deal_id: string | number;
  deal_name: string;
  user_email: string;
  user_name: string;
  flag: boolean;
  action_taken: string;
  deal_owner_id: string;
}

// ======================
// HubDB Related Types
// ======================
interface HubDBRow {
  id: string;
  values: Record<string, any>;
}

interface HubDBResponse {
  objects: HubDBRow[];
}

interface HubDBTableSchema {
  id: string;
  name: string;
  columns: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

// ======================
// HubSpot CRM Core Types
// ======================
interface HubSpotOwner {
  id: string;
  email: string;
  type: string;
  firstName: string;
  lastName: string;
  userId: number;
  userIdIncludingInactive: number;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

interface HubspotContact {
  id: string;
  properties: {
    createdate: string;
    email: string;
    firstname: string;
    hs_object_id: string;
    lastmodifieddate: string;
    lastname: string;
    [key: string]: string | undefined; // For additional properties
  };
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

// ======================
// HubSpot Task Types
// ======================
interface HubSpotCreateTaskResponse {
  id: string;
  properties: {
    hs_all_owner_ids: string;
    hs_body_preview: string;
    hs_body_preview_html: string;
    hs_body_preview_is_truncated: string;
    hs_createdate: string;
    hs_engagements_last_contacted: string;
    hs_lastmodifieddate: string;
    hs_object_coordinates: string;
    hs_object_id: string;
    hs_object_source: string;
    hs_object_source_id: string;
    hs_object_source_label: string;
    hs_task_body: string;
    hs_task_completion_count: string;
    hs_task_family: string;
    hs_task_for_object_type: string;
    hs_task_is_all_day: string;
    hs_task_is_completed: string;
    hs_task_is_completed_call: string;
    hs_task_is_completed_email: string;
    hs_task_is_completed_linked_in: string;
    hs_task_is_completed_sequence: string;
    hs_task_is_overdue: string;
    hs_task_is_past_due_date: string;
    hs_task_missed_due_date: string;
    hs_task_missed_due_date_count: string;
    hs_task_priority: string;
    hs_task_status: string;
    hs_task_subject: string;
    hs_task_type: string;
    hs_timestamp: string;
    hs_user_ids_of_all_owners: string;
    hubspot_owner_assigneddate: string;
    hubspot_owner_id: string;
  };
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

// ======================
// API Request/Response Types
// ======================
interface HubspotErrorContext {
  context: string;
  error: unknown;
}

interface HubspotRequestOptions {
  url: string;
  method: string;
  body?: unknown;
  context: string;
}

interface PaginatedResponse {
  results?: unknown[];
  paging?: {
    next?: {
      after?: string;
    };
  };
}

// ======================
// Search API Types
// ======================
interface HubspotSearchFilter {
  propertyName: string;
  operator: string;
  value: string | number | boolean;
}

interface HubspotSearchRequest {
  filterGroups: Array<{
    filters: HubspotSearchFilter[];
  }>;
  properties: string[];
  limit?: number;
  after?: string;
}

interface HubspotSearchResponse<T = HubspotContact> {
  total: number;
  results: T[];
  paging?: {
    next?: {
      after: string;
    };
  };
}

export type {
  LambdaEvent,
  LambdaResponse,
  RequestBody,
  HubDBRow,
  HubDBResponse,
  HubDBTableSchema,
  HubSpotOwner,
  HubspotContact,
  HubSpotCreateTaskResponse,
  HubspotErrorContext,
  HubspotRequestOptions,
  PaginatedResponse,
  HubspotSearchFilter,
  HubspotSearchRequest,
  HubspotSearchResponse,
};
