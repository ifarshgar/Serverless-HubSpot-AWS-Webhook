import { corsHeaders } from '../config.js';
import {
  createHubspotAssociation,
  createHubspotTask,
  createTaskToDealAssociation,
  deleteHubspotAssociations,
  deleteHubspotTask,
  fetchAllHubspotOwners,
  fetchTasksByOwnerAndDeal,
  searchContactByEmail,
} from '../hubspotUtils.js';
import { LambdaEvent, LambdaResponse } from '../types.js';

enum ActionTaken {
  MeldInteresse = 'Meld interesse',
  AvmeldInteresse = 'Avmeld interesse',
}

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
    if (typeof action_taken === 'string' && action_taken === ActionTaken.MeldInteresse) {
      console.log('Meld interesse action was taken');
    } else if (typeof action_taken === 'string' && action_taken === ActionTaken.AvmeldInteresse) {
      console.log('Avmeld interesse action was taken');
    } else {
      console.log('Action not allowed: ', action_taken);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Not allowed!' }),
      };
    }

    let result: any;

    // ------------------------------------------
    // Create or delete deal to contact assocaition
    // ------------------------------------------
    const contacts = await searchContactByEmail(user_email);

    if (contacts.length === 0) {
      console.log('Contact not found, skiping...');
    } else {
      const contact = contacts[0];
      console.log('Contact found:', contact);

      if (ActionTaken.MeldInteresse === action_taken) {
        result = await createHubspotAssociation(
          'deals',
          deal_id,
          'contacts',
          contact.id,
          'default'
        );
      } else if (ActionTaken.AvmeldInteresse === action_taken) {
        result = await deleteHubspotAssociations('deals', 'contacts', [
          {
            fromId: deal_id,
            toIds: [contact.id],
          },
        ]);
      }
    }

    // ------------------------------------------
    // Create task for deal owner
    // ------------------------------------------
    try {
      const corrected = deal_owner_id
        .replace(/(\w+)=/g, '"$1":') // wrap keys in quotes
        .replace(/:\s*([^",{}]+)/g, ':"$1"') // wrap values in quotes (simple version)
        .replace(/",\s*/g, '",') // clean spacing
        .replace(/^"{/, '{') // remove surrounding quotes
        .replace(/}"$/, '}'); // remove surrounding quotes

      const parsedDealOwner = JSON.parse(corrected);
      console.log('Parsed deal owner:', parsedDealOwner);
      const dealOwnerId = parsedDealOwner.owner_id;
      console.log('Deal owner ID:', dealOwnerId);
      if (parsedDealOwner && dealOwnerId && user_email) {
        const owners = await fetchAllHubspotOwners();
        const owner = owners.find((owner) => owner.email === user_email);
        const ownerId = owner?.id || dealOwnerId;

        if (action_taken !== ActionTaken.AvmeldInteresse) {
          const taskSubject = `New interest in deal: ${deal_name}`;
          const taskBody = `${user_email} has shown interest in the deal "${deal_name}". Please follow up.`;
          const task = await createHubspotTask(ownerId, taskSubject, taskBody, {
            hs_task_priority: 'HIGH',
            hs_task_status: 'NOT_STARTED',
          });
          // await createHubspotAssociation('tasks', task.id, 'deals', deal_id, '216');
          await createTaskToDealAssociation(task.id, deal_id);
          console.log('Created task for owner:', task);
        } else if (action_taken === ActionTaken.AvmeldInteresse) {
          const tasks = await fetchTasksByOwnerAndDeal(ownerId, deal_id);
          if (tasks.length > 0) {
            await deleteHubspotTask(tasks[0].id);
            console.log('Deleted task:', tasks[0].id);
          }
        }
      }
    } catch (error) {
      console.error('Error in owner task creation/deletion process:', error);
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
        error: 'Failed to finish the request successfully',
        message: error.message,
      }),
    };
  }
};
