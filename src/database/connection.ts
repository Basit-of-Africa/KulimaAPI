import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../config/env.js';
import * as schema from './schema.js';

const connectionString = env.database.url;

// Create the postgres.js client (won't connect until first query)
const client = postgres(connectionString, {
  max: 20,
  idle_timeout: 20,
  connect_timeout: 2,
});

// Create the drizzle instance with schema
export const db = drizzle(client, { schema });

// Helper to test database connection
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await client`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
  await client.end();
}
