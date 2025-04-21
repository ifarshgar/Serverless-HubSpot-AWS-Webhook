const { HUBSPOT_TABLE_ID, corsHeaders } = require('./config');
const {
  fetchHubDBTableRows,
  createHubDBTableRow,
  updateHubDBTableRow,
  fetchHubDBTable,
  publishHubDBTable,
} = require('./hubspotUtils');

const handler = async (event) => {
  

  try {

    const rows = await fetchHubDBTableRows(HUBSPOT_TABLE_ID);
    console.log('allRows', JSON.stringify(rows, null, 2));

    // const rows2 = await fetchHubDBTable(HUBSPOT_TABLE_ID);
    // console.log('allRows2', JSON.stringify(rows2, null, 2));

    const existingRecord = rows.objects.find((row) => {
      if (row.values) {
        const dealId = row.values[2];
        const userEmail = row.values[3];

        if (dealId && userEmail) {
          return dealId === '172456797423' && userEmail === 'a@b.com';
        }
      }
      return false;
    });

    // Update or create record
    if (existingRecord) {
      console.log('Updating existing record.');
    } else {
      console.log('Creating new record:', dealObject);
    }

      publishHubDBTable(HUBSPOT_TABLE_ID)
        .then(() => {
          console.log('Publishing HubDB table...');
        })
        .catch((error) => {
          console.error('Error publishing:', error);
        });

  } catch (error) {
    console.error('HubDB Error:', error);
  }
};

handler();

