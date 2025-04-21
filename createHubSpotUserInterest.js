const { HUBSPOT_TABLE_ID, corsHeaders } = require('./config');
const {
  fetchHubDBTableRows,
  createHubDBTableRow,
  updateHubDBTableRow,
  publishHubDBTable,
  fetchHubspotOwnerDetails,
  createHubspotTask,
} = require('./hubspotUtils');

exports.handler = async (event) => {
  // Handle OPTIONS request for CORS preflight
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

    if (action_taken === 'Meld interesse') {
      console.log('Meld interesse action was taken');
    } else {
      console.log('Action not allowed: ', action_taken);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Action not allowed.' }),
      };
    }

    const dealObject = {
      2: deal_id.toString(),
      9: deal_name,
      3: user_email,
      10: user_name,
      8: flag == true ? 1 : 0,
      11: new Date().getTime(),
    };

    let result;

    const rows = await fetchHubDBTableRows(HUBSPOT_TABLE_ID);
    console.log('allRows', JSON.stringify(rows, null, 2));

    const existingRecord = rows.objects.find((row) => {
      if (row.values) {
        const id = row.values[2];
        const email = row.values[3];

        if (id && email) {
          return id === deal_id.toString() && email === user_email;
        }
      }
      return false;
    });

    // Update or create record
    if (existingRecord) {
      console.log('Updating existing record:', existingRecord);
      result = await updateHubDBTableRow(HUBSPOT_TABLE_ID, dealObject, existingRecord.id);
    } else {
      console.log('Creating new record:', dealObject);
      result = await createHubDBTableRow(HUBSPOT_TABLE_ID, dealObject);
    }

    // -------------------------------------------
    // Publish the HubDB table after creating or updating a row
    // -------------------------------------------
    (async () => {
      try {
        console.log('Starting background publish of HubDB table...');
        await publishHubDBTable(HUBSPOT_TABLE_ID);
        console.log('Background HubDB table publish completed');
      } catch (error) {
        console.error('Background HubDB publish failed:', error);
      }
    })();

    // -----------------------------------------
    // Making a task for the owner of the deal
    // -----------------------------------------
    if (deal_owner_id) {
      try {
        const taskSubject = `New interest in deal: ${deal_name}`;
        const taskBody = `${user_name} (${user_email}) has shown interest in the deal "${deal_name}". Please follow up.`;
        const task = await createHubspotTask(deal_owner_id, taskSubject, taskBody, {
          hs_task_priority: 'HIGH',
          hs_task_status: 'NOT_STARTED',
        });
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
  } catch (error) {
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
