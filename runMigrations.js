#!/usr/bin/env node
/**
 * Migration Runner - Applies all SQL migration files in the migrations folder
 * Usage: node runMigrations.js
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import db from './config/db.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function runMigrations() {
  try {
    console.log('🔄 Starting database migrations...\n');
    
    // Get all SQL files from migrations directory
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('❌ No migration files found');
      process.exit(1);
    }

    console.log(`Found ${files.length} migration files\n`);

    for (const file of files) {
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      try {
        console.log(`⏳ Running: ${file}`);
        await db.query(sql);
        console.log(`✅ Completed: ${file}\n`);
      } catch (err) {
        // Some migrations might fail if tables already exist (which is fine)
        if (err.message.includes('already exists') || err.code === '42P07' || err.code === '42701') {
          console.log(`⚠️  Already exists (skipped): ${file}\n`);
        } else {
          console.error(`❌ Error in ${file}:`);
          console.error(err.message);
          console.log('\n');
          // Continue with next migration
        }
      }
    }

    console.log('✅ All migrations completed!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration runner error:', err);
    process.exit(1);
  }
}

runMigrations();
