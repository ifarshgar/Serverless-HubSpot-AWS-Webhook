import { HUBSPOT_TABLE_ID } from './config.js';
import { fetchHubDBTableRows } from './hubspotUtils.js';

const main = async () => {
  const rows = await fetchHubDBTableRows(HUBSPOT_TABLE_ID);
  console.log('allRows', JSON.stringify(rows, null, 2));

  const existingRecord = rows.find((row) => {
    if (row.values) {
      const id = row.values[2];
      const email = row.values[3];

      if (id && email) {
        return id === '172456797423' && email === 'rahman@frei.as';
      }
    }
    return false;
  });

  // ------------------------------------------
  // Update or create record
  // ------------------------------------------
  if (existingRecord) {
    console.log('Updating existing record:', existingRecord);
  } else {
    console.log('Creating new record...');
  }
};

console.log('Starting script...');
main();

