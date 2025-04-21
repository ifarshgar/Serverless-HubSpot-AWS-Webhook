const { HUBSPOT_ACCESS_TOKEN } = require('./config');
const hubspot = require('@hubspot/api-client');

const HubspotBaseUrl = 'https://api.hubapi.com/crm/v3/objects';
const HubDBBaseUrl = 'https://api.hubapi.com/hubdb/api/v2';
const DEFAULT_HEADERS = {
  Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
  'Content-Type': 'application/json',
};

const handleHubspotError = async (error, context) => {
  const errorMessage = `HubSpot Error in ${context}: ${error?.message}`;
  console.error(errorMessage, error.stack || error);
  throw error;
};

const makeHubspotRequest = async (url, method, body, context) => {
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

    const responseData = await response.json();
    console.log(`HubSpot API request succeeded: ${context}`);
    return responseData;
  } catch (error) {
    await handleHubspotError(error, context);
  }
};

const fetchPaginatedData = async (url, propertyParams, resourceName, limit = 100) => {
  const allResults = [];
  let after = null;
  let pageCount = 0;

  console.log(`Starting paginated fetch for ${resourceName}`);

  do {
    pageCount++;
    const requestUrl = new URL(url);
    if (after) requestUrl.searchParams.append('after', after);
    if (propertyParams) requestUrl.searchParams.append('properties', propertyParams);
    requestUrl.searchParams.append('limit', limit);

    console.log(
      `Fetching page ${pageCount} for ${resourceName}${after ? ` (after: ${after})` : ''}`
    );

    const data = await makeHubspotRequest(
      requestUrl.toString(),
      'GET',
      null,
      `fetchPaginatedData-${resourceName}-page${pageCount}`
    );

    allResults.push(...(data.results || []));
    after = data.paging?.next?.after || null;
  } while (after);

  console.log(
    `Completed paginated fetch for ${resourceName}. Total pages: ${pageCount}, Total records: ${allResults.length}`
  );
  return allResults;
};

// Fetches all rows from a HubDB table
const fetchHubDBTableRows = async (tableId, columns = []) => {
  const context = `fetchHubDBTableRows-${tableId}`;
  try {
    const url = new URL(`${HubDBBaseUrl}/tables/${tableId}/rows`);
    if (columns.length > 0) {
      url.searchParams.append('columnNames', columns.join(','));
      url.searchParams.append('limit', 100);
    }
    const response = await makeHubspotRequest(url.toString(), 'GET', null, context);
    return response || [];
  } catch (error) {
    await handleHubspotError(error, context);
  }
};

// Fetches a single row from a HubDB table by row ID
const fetchHubDBTableRow = async (tableId, rowId) => {
  const context = `fetchHubDBTableRow-${tableId}-${rowId}`;
  try {
    const url = `${HubDBBaseUrl}/tables/${tableId}/rows/${rowId}`;
    return await makeHubspotRequest(url, 'GET', null, context);
  } catch (error) {
    await handleHubspotError(error, context);
  }
};

// Fetches the schema/metadata for a HubDB table
const fetchHubDBTableSchema = async (tableId) => {
  const context = `fetchHubDBTableSchema-${tableId}`;
  try {
    const url = `${HubDBBaseUrl}/tables/${tableId}`;
    return await makeHubspotRequest(url, 'GET', null, context);
  } catch (error) {
    await handleHubspotError(error, context);
  }
};

// Fetches all data from a HubDB table including schema and rows
const fetchHubDBTable = async (tableId, columns = []) => {
  const context = `fetchHubDBTable-${tableId}`;
  try {
    const [schema, rows] = await Promise.all([
      fetchHubDBTableSchema(tableId),
      fetchHubDBTableRows(tableId, columns),
    ]);
    return { schema, rows };
  } catch (error) {
    await handleHubspotError(error, context);
  }
};

// Creates a new row in a HubDB table
const createHubDBTableRow = async (tableId, rowData) => {
  const context = `createHubDBTableRow-${tableId}`;
  try {
    const url = `${HubDBBaseUrl}/tables/${tableId}/rows`;
    return await makeHubspotRequest(url, 'POST', { values: rowData }, context);
  } catch (error) {
    await handleHubspotError(error, context);
  }
};

// Updates a row in a HubDB table
const updateHubDBTableRow = async (tableId, rowData, rowId) => {
  const context = `updateHubDBTableRow-${tableId}-${rowId}`;
  try {
    const url = `${HubDBBaseUrl}/tables/${tableId}/rows/${rowId}`;
    return await makeHubspotRequest(url, 'PUT', { values: rowData }, context);
  } catch (error) {
    await handleHubspotError(error, context);
  }
};

// Deletes a row from a HubDB table
const deleteHubDBTableRow = async (tableId, rowId) => {
  const context = `deleteHubDBTableRow-${tableId}-${rowId}`;
  try {
    const url = `${HubDBBaseUrl}/tables/${tableId}/rows/${rowId}`;
    return await makeHubspotRequest(url, 'DELETE', null, context);
  } catch (error) {
    await handleHubspotError(error, context);
  }
};

async function publishHubDBTable(tableId) {
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

const fetchHubspotOwnerDetails = async (ownerId) => {
  const context = `fetchOwnerDetails-${ownerId}`;
  try {
    const url = `${HubspotBaseUrl}/owners/${ownerId}`;
    return await makeHubspotRequest(url, 'GET', null, context);
  } catch (error) {
    await handleHubspotError(error, context);
  }
};

//  Creates a task in HubSpot assigned to a specific owner
const createHubspotTask = async (ownerId, subject, body, additionalProps = {}) => {
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
    return await makeHubspotRequest(url, 'POST', taskData, context);
  } catch (error) {
    await handleHubspotError(error, context);
  }
};

module.exports = {
  makeHubspotRequest,
  fetchPaginatedData,
  HubspotBaseUrl,
  HubDBBaseUrl,
  fetchHubDBTableRows,
  fetchHubDBTableRow,
  fetchHubDBTableSchema,
  fetchHubDBTable,
  createHubDBTableRow,
  updateHubDBTableRow,
  deleteHubDBTableRow,
  publishHubDBTable,
  fetchHubspotOwnerDetails,
  createHubspotTask,
};
