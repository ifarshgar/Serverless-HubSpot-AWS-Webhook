import dotenv from 'dotenv';

dotenv.config();

const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN as string;
const HUBSPOT_TABLE_ID = process.env.HUBSPOT_TABLE_ID as string;
const NODE_ENV = process.env.NODE_ENV || 'development';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
  'Content-Type': 'application/json',
};

export { HUBSPOT_ACCESS_TOKEN, HUBSPOT_TABLE_ID, NODE_ENV, corsHeaders };
