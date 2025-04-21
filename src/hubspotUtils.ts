import { HUBSPOT_ACCESS_TOKEN } from "./config.js";
import { HubDBRow, HubDBTableSchema, PaginatedResponse } from "./types.js";
import hubspot from '@hubspot/api-client';

const HubspotBaseUrl = 'https://api.hubapi.com/crm/v3/objects';
const HubDBBaseUrl = 'https://api.hubapi.com/hubdb/api/v2';
const DEFAULT_HEADERS = {
  Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
  'Content-Type': 'application/json',
};

export const handleHubspotError = async (error: unknown, context: string): Promise<never> => {
  const errorMessage = `HubSpot Error in ${context}: ${
    error instanceof Error ? error.message : String(error)
  }`;
  console.error(errorMessage, error instanceof Error ? error.stack : '');
  throw error;
};

export const makeHubspotRequest = async <T = unknown>(
  url: string,
  method: string,
  body: unknown,
  context: string
): Promise<T> => {
  try {
    const requestInfo = {
      url,
      method,
      context,
      bodySize: body ? JSON.stringify(body).length : 0,
    };
    console.log(`Making HubSpot API request: ${JSON.stringify(requestInfo)}`);

    const response = await fetch(url, {
      method,
      headers: DEFAULT_HEADERS,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = `HubSpot API request failed: ${response.status} ${response.statusText}. Context: ${context}`;
      console.error(`${errorMessage}. Details: ${JSON.stringify(errorData)}`);
      throw new Error(errorMessage);
    }

    const responseData = await response.json() as T;
    console.log(`HubSpot API request succeeded: ${context}`);
    return responseData;
  } catch (error) {
    await handleHubspotError(error, context);
    throw error; 
  }
};

export const fetchPaginatedData = async <T = unknown>(
  url: string,
  propertyParams: string,
  resourceName: string,
  limit = 100
): Promise<T[]> => {
  const allResults: T[] = [];
  let after: string | null = null;
  let pageCount = 0;

  console.log(`Starting paginated fetch for ${resourceName}`);

  do {
    pageCount++;
    const requestUrl = new URL(url);
    if (after) requestUrl.searchParams.append('after', after);
    if (propertyParams) requestUrl.searchParams.append('properties', propertyParams);
    requestUrl.searchParams.append('limit', limit.toString());

    console.log(
      `Fetching page ${pageCount} for ${resourceName}${after ? ` (after: ${after})` : ''}`
    );

    const data = await makeHubspotRequest<PaginatedResponse>(
      requestUrl.toString(),
      'GET',
      null,
      `fetchPaginatedData-${resourceName}-page${pageCount}`
    );

    if (data.results) {
      allResults.push(...(data.results as T[]));
    }
    after = data.paging?.next?.after || null;
  } while (after);

  console.log(
    `Completed paginated fetch for ${resourceName}. Total pages: ${pageCount}, Total records: ${allResults.length}`
  );
  return allResults;
};

export const fetchHubDBTableRows = async (
  tableId: string,
  columns: string[] = []
): Promise<HubDBRow[]> => {
  const context = `fetchHubDBTableRows-${tableId}`;
  try {
    const url = new URL(`${HubDBBaseUrl}/tables/${tableId}/rows`);
    if (columns.length > 0) {
      url.searchParams.append('columnNames', columns.join(','));
      url.searchParams.append('limit', '100');
    }
    const response = await makeHubspotRequest<{ objects: HubDBRow[] }>(
      url.toString(),
      'GET',
      null,
      context
    );
    return response.objects || [];
  } catch (error) {
    return handleHubspotError(error, context);
  }
};

export const fetchHubDBTableRow = async (tableId: string, rowId: string): Promise<HubDBRow> => {
  const context = `fetchHubDBTableRow-${tableId}-${rowId}`;
  try {
    const url = `${HubDBBaseUrl}/tables/${tableId}/rows/${rowId}`;
    return await makeHubspotRequest<HubDBRow>(url, 'GET', null, context);
  } catch (error) {
    return handleHubspotError(error, context);
  }
};

export const fetchHubDBTableSchema = async (tableId: string): Promise<HubDBTableSchema> => {
  const context = `fetchHubDBTableSchema-${tableId}`;
  try {
    const url = `${HubDBBaseUrl}/tables/${tableId}`;
    return await makeHubspotRequest<HubDBTableSchema>(url, 'GET', null, context);
  } catch (error) {
    return handleHubspotError(error, context);
  }
};

export const fetchHubDBTable = async (
  tableId: string,
  columns: string[] = []
): Promise<{ schema: HubDBTableSchema; rows: HubDBRow[] }> => {
  const context = `fetchHubDBTable-${tableId}`;
  try {
    const [schema, rows] = await Promise.all([
      fetchHubDBTableSchema(tableId),
      fetchHubDBTableRows(tableId, columns),
    ]);
    return { schema, rows };
  } catch (error) {
    return handleHubspotError(error, context);
  }
};

export const createHubDBTableRow = async (
  tableId: string,
  rowData: Record<string, unknown>
): Promise<HubDBRow> => {
  const context = `createHubDBTableRow-${tableId}`;
  try {
    const url = `${HubDBBaseUrl}/tables/${tableId}/rows`;
    return await makeHubspotRequest<HubDBRow>(url, 'POST', { values: rowData }, context);
  } catch (error) {
    return handleHubspotError(error, context);
  }
};

export const updateHubDBTableRow = async (
  tableId: string,
  rowData: Record<string, unknown>,
  rowId: string
): Promise<HubDBRow> => {
  const context = `updateHubDBTableRow-${tableId}-${rowId}`;
  try {
    const url = `${HubDBBaseUrl}/tables/${tableId}/rows/${rowId}`;
    return await makeHubspotRequest<HubDBRow>(url, 'PUT', { values: rowData }, context);
  } catch (error) {
    return handleHubspotError(error, context);
  }
};

export const deleteHubDBTableRow = async (tableId: string, rowId: string): Promise<void> => {
  const context = `deleteHubDBTableRow-${tableId}-${rowId}`;
  try {
    const url = `${HubDBBaseUrl}/tables/${tableId}/rows/${rowId}`;
    await makeHubspotRequest(url, 'DELETE', null, context);
  } catch (error) {
    return handleHubspotError(error, context);
  }
};

export async function publishHubDBTable(tableId: string): Promise<unknown> {
  try {
    const hubspotClient = new hubspot.Client({
      accessToken: HUBSPOT_ACCESS_TOKEN,
    });

    const result = await hubspotClient.apiRequest({
      method: 'POST',
      path: `/cms/v3/hubdb/tables/${tableId}/draft/publish`,
      body: { includeForeignIds: true },
    });

    return result.body;
  } catch (error) {
    console.error('Error publishing HubDB table:', error);
    throw error;
  }
}

export const fetchHubspotOwnerDetails = async (
  ownerId: string
): Promise<Record<string, unknown>> => {
  const context = `fetchOwnerDetails-${ownerId}`;
  try {
    const url = `${HubspotBaseUrl}/owners/${ownerId}`;
    return await makeHubspotRequest<Record<string, unknown>>(url, 'GET', null, context);
  } catch (error) {
    return handleHubspotError(error, context);
  }
};

export const createHubspotTask = async (
  ownerId: string,
  subject: string,
  body: string,
  additionalProps: Record<string, unknown> = {}
): Promise<Record<string, unknown>> => {
  const context = `createTask-${ownerId}`;
  try {
    const url = `${HubspotBaseUrl}/tasks`;
    const taskData = {
      properties: {
        hs_task_subject: subject,
        hs_task_body: body,
        hs_task_type: 'TODO',
        hs_task_priority: 'HIGH',
        hs_task_status: 'NOT_STARTED',
        hs_timestamp: new Date().toISOString(),
        hubspot_owner_id: ownerId,
        ...additionalProps,
      },
    };
    return await makeHubspotRequest<Record<string, unknown>>(url, 'POST', taskData, context);
  } catch (error) {
    return handleHubspotError(error, context);
  }
};
