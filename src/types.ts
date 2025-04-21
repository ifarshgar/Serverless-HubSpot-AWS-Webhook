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

interface HubDBRow {
  id: string;
  values: Record<string, any>;
}

interface HubDBResponse {
  objects: HubDBRow[];
}

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

interface HubDBTableSchema {
  id: string;
  name: string;
  columns: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

export type {
  LambdaEvent,
  LambdaResponse,
  RequestBody,
  HubDBRow,
  HubDBResponse,
  HubspotErrorContext,
  HubspotRequestOptions,
  PaginatedResponse,
  HubDBTableSchema,
};
