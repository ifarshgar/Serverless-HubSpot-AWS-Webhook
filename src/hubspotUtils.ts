import { HUBSPOT_ACCESS_TOKEN } from './config.js';
import {
  HubDBRow,
  HubDBTableSchema,
  HubspotContact,
  HubSpotCreateTaskResponse,
  HubSpotOwner,
  HubspotSearchRequest,
  HubspotSearchResponse,
  PaginatedResponse,
} from './types.js';
import * as hubspot from '@hubspot/api-client';

const HubspotBaseUrl = 'https://api.hubapi.com/crm/v3/objects';
const HubspotBaseUrlV4 = 'https://api.hubapi.com/crm/v4/objects';
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

    // Handle 204 No Content responses
    if (response.status === 204) {
      console.log(`HubSpot API request succeeded (204 No Content): ${context}`);
      return {} as T; // Return empty object for 204 responses
    }

    const responseData = (await response.json()) as T;
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
    if (!hubspot || !hubspot.Client) {
      throw new Error('HubSpot client library is not properly initialized');
    }

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

export const fetchAllHubspotOwners = async (): Promise<HubSpotOwner[]> => {
  const context = 'fetchAllOwners';
  try {
    const url = 'https://api.hubapi.com/crm/v3/owners';
    const response = await makeHubspotRequest<{ results: HubSpotOwner[] }>(
      url,
      'GET',
      null,
      context
    );
    return response.results || [];
  } catch (error) {
    return handleHubspotError(error, context);
  }
};

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
): Promise<HubSpotCreateTaskResponse> => {
  const context = `createTask-${subject}`;
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
    return await makeHubspotRequest<HubSpotCreateTaskResponse>(url, 'POST', taskData, context);
  } catch (error) {
    return handleHubspotError(error, context);
  }
};

export const searchHubspotObjects = async <T>(
  objectType: string,
  searchRequest: HubspotSearchRequest,
  context: string
): Promise<HubspotSearchResponse<T>> => {
  try {
    const url = `${HubspotBaseUrl}/${objectType}/search`;
    return await makeHubspotRequest(url, 'POST', searchRequest, context);
  } catch (error) {
    return handleHubspotError(error, context);
  }
};

export const searchContactByEmail = async (
  email: string,
  additionalProperties: string[] = []
): Promise<HubspotContact[]> => {
  const context = `searchContactByEmail-${email}`;
  try {
    const searchRequest: HubspotSearchRequest = {
      filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email }] }],
      properties: ['email', 'firstname', 'lastname', ...additionalProperties],
      limit: 1,
    };

    const response = await searchHubspotObjects<HubspotContact>('contacts', searchRequest, context);
    return response.results || [];
  } catch (error) {
    return handleHubspotError(error, context);
  }
};

export const createHubspotAssociation = async (
  fromObjectType: string,
  fromObjectId: string,
  toObjectType: string,
  toObjectId: string,
  associationType: string
): Promise<Record<string, unknown>> => {
  const context = `createAssociation-${fromObjectType}-${fromObjectId}-${toObjectType}-${toObjectId}`;
  try {
    const url = `${HubspotBaseUrlV4}/${fromObjectType}/${fromObjectId}/associations/${associationType}/${toObjectType}/${toObjectId}`;
    console.log(`Creating association: ${url}`);
    // HubSpot PUT associations endpoint expects an empty body
    return await makeHubspotRequest(url, 'PUT', {}, context);
  } catch (error) {
    return handleHubspotError(error, context);
  }
};

export const createTaskToDealAssociation = async (
  taskId: string,
  dealId: string
): Promise<Record<string, unknown>> => {
  const context = `createTaskDealAssociation-${taskId}-${dealId}`;
  try {
    const url = `https://api.hubapi.com/crm/v3/objects/tasks/${taskId}/associations/deals/${dealId}/216`;
    console.log(`Creating task to deal association: ${url}`);
    // HubSpot PUT associations endpoint expects an empty body
    return await makeHubspotRequest(url, 'PUT', {}, context);
  } catch (error) {
    return handleHubspotError(error, context);
  }
};

export const deleteHubspotAssociations = async (
  fromObjectType: string,
  toObjectType: string,
  associations: Array<{
    fromId: string;
    toIds: string[];
  }>
): Promise<Record<string, unknown>> => {
  const context = `deleteAssociations-${fromObjectType}-to-${toObjectType}`;
  try {
    const url = `https://api.hubapi.com/crm/v4/associations/${fromObjectType}/${toObjectType}/batch/archive`;
    console.log(`Deleting association: ${url}`);

    const requestBody = {
      inputs: associations.map((assoc) => ({
        from: { id: assoc.fromId },
        to: assoc.toIds.map((toId) => ({ id: toId })),
      })),
    };
    console.log(`Request body: ${JSON.stringify(requestBody)}`);

    console.log(
      `Deleting ${associations.length} associations between ${fromObjectType} and ${toObjectType}`
    );

    return await makeHubspotRequest(url, 'POST', requestBody, context);
  } catch (error) {
    return handleHubspotError(error, context);
  }
};

export const fetchTasksByOwnerAndDeal = async (
  ownerId: string,
  dealId: string
): Promise<Array<{ id: string; properties: Record<string, string> }>> => {
  const context = `fetchTasksByOwnerAndDeal-${ownerId}-${dealId}`;
  try {
    const url = new URL(`${HubspotBaseUrl}/tasks`);
    url.searchParams.append('properties', 'hs_task_subject,hs_task_status');
    url.searchParams.append(
      'filterGroups',
      JSON.stringify([
        {
          filters: [
            { propertyName: 'hubspot_owner_id', operator: 'EQ', value: ownerId },
            { propertyName: 'associations.deal', operator: 'EQ', value: dealId },
          ],
        },
      ])
    );
    url.searchParams.append('limit', '10'); // Limit to most recent tasks

    const response = await makeHubspotRequest<{
      results: Array<{ id: string; properties: Record<string, string> }>;
    }>(url.toString(), 'GET', null, context);
    return response.results || [];
  } catch (error) {
    return handleHubspotError(error, context);
  }
};

export const deleteHubspotTask = async (taskId: string): Promise<void> => {
  const context = `deleteHubspotTask-${taskId}`;
  try {
    const url = `${HubspotBaseUrl}/tasks/${taskId}`;
    await makeHubspotRequest(url, 'DELETE', null, context);
    console.log(`Successfully deleted task ${taskId}`);
  } catch (error) {
    return handleHubspotError(error, context);
  }
};

