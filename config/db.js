import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Also try loading from root .env as fallback
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

console.log('DATABASE_URL loaded:', process.env.DATABASE_URL ? 'YES' : 'NO');
console.log('DATABASE_URL starts with:', process.env.DATABASE_URL?.substring(0, 20) + '...');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set!');
  console.error('Please create a .env file in the backend directory with DATABASE_URL=postgres://username:password@host:port/database');
  process.exit(1);
}

let pool;
try {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Add connection options for better error handling
    connectionTimeoutMillis: 10000, // 10 seconds
    query_timeout: 10000,
    statement_timeout: 60000,
    idleTimeoutMillis: 30000,
    max: 20,
  });

  // Test the connection
  pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL database');
  });

  pool.on('error', (err) => {
    console.error('❌ Database pool error:', err.message);
  });

} catch (error) {
  console.error('❌ Failed to create database pool:', error.message);
  process.exit(1);
}

export default pool;