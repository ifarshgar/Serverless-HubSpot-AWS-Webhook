import { corsHeaders, HUBSPOT_TABLE_ID } from '../config.js';
import {
  createHubDBTableRow,
  createHubspotAssociation,
  createHubspotTask,
  fetchAllHubspotOwners,
  fetchHubDBTableRows,
  publishHubDBTable,
  updateHubDBTableRow,
} from '../hubspotUtils.js';
import { LambdaEvent, LambdaResponse } from '../types.js';

export const handler = async (event: LambdaEvent): Promise<LambdaResponse> => {
  // --------------------------------------------
  // Handle OPTIONS request for CORS preflight
  // --------------------------------------------
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({}),
    };
  }

  try {
    const { deal_id, deal_name, user_email, user_name, flag, action_taken, deal_owner_id } =
      JSON.parse(event.body);
    console.log('Received data:', JSON.stringify(event.body, null, 2));

    if (!deal_id || !user_email || flag === undefined) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing required fields: deal_id, user_email, flag' }),
      };
    }

    // ------------------------------------------
    // Validate user action
    // ------------------------------------------
    if (typeof action_taken === 'string' && action_taken === 'Meld interesse') {
      console.log('Meld interesse action was taken');
    } else {
      console.log('Action not allowed: ', action_taken);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Action not allowed.' }),
      };
    }

    const dealObject: Record<string, any> = {
      2: deal_id.toString(),
      9: deal_name,
      3: user_email,
      10: user_name,
      8: flag?.toString() === 'true' ? 1 : 0,
      11: new Date().getTime(),
    };

    let result: any;

    const rows = await fetchHubDBTableRows(HUBSPOT_TABLE_ID);
    console.log('allRows', JSON.stringify(rows, null, 2));

    const existingRecord = rows.find((row) => {
      if (row.values) {
        const id = row.values[2];
        const email = row.values[3];

        if (id && email) {
          return id === deal_id.toString() && email === user_email;
        }
      }
      return false;
    });

    // ------------------------------------------
    // Update or create record
    // ------------------------------------------
    if (existingRecord) {
      console.log('Updating existing record:', existingRecord);
      result = await updateHubDBTableRow(HUBSPOT_TABLE_ID, dealObject, existingRecord.id);
    } else {
      console.log('Creating new record:', dealObject);
      result = await createHubDBTableRow(HUBSPOT_TABLE_ID, dealObject);
    }

    // ------------------------------------------
    // Background publish of HubDB table
    // ------------------------------------------
    (async () => {
      try {
        console.log('Starting background publish of HubDB table...');
        await publishHubDBTable(HUBSPOT_TABLE_ID);
        console.log('Background HubDB table publish completed');
      } catch (error) {
        console.error('Background HubDB publish failed:', error);
      }
    })();

    // ------------------------------------------
    // Create task for deal owner if specified
    // ------------------------------------------
    if (deal_owner_id && user_email) {
      try {
        const owners = await fetchAllHubspotOwners();
        const owner = owners.find((owner) => owner.email === user_email);
        const ownerId = owner?.id || deal_owner_id;

        const taskSubject = `New interest in deal: ${deal_name}`;
        const taskBody = `${user_email} has shown interest in the deal "${deal_name}". Please follow up.`;
        const task = await createHubspotTask(ownerId, taskSubject, taskBody, {
          hs_task_priority: 'HIGH',
          hs_task_status: 'NOT_STARTED',
        });

        await createHubspotAssociation('tasks', task.id, 'deals', deal_id, '216');

        console.log('Created task for owner:', task);
      } catch (error) {
        console.error('Error in owner task creation process:', error);
      }
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        data: result,
      }),
    };
  } catch (error: any) {
    console.error('HubDB Error:', error);
    return {
      statusCode: error.statusCode || 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Database operation failed',
        message: error.message,
      }),
    };
  }
};
