import 'dotenv/config';
import db from './config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixBaptismSchema() {
  try {
    console.log('🔄 Fixing baptism_candidates table schema...\n');

    // Read the cell_ministry_enhancements.sql migration
    const migrationPath = path.join(__dirname, 'migrations', 'cell_ministry_enhancements.sql');
    const fullSql = fs.readFileSync(migrationPath, 'utf-8');

    // Extract baptism tables creation script
    const baptismStart = fullSql.indexOf('-- Baptism Candidates');
    const baptismEnd = fullSql.indexOf('-- Baptism Records') + 500; // get a good chunk after the mark

    if (baptismStart === -1) {
      console.log('❌ Could not find baptism schema in migration file');
      process.exit(1);
    }

    // Drop dependent tables first (baptism_records depends on baptism_candidates)
    console.log('⏳ Dropping dependent tables...');
    await db.query('DROP TABLE IF EXISTS baptism_records CASCADE');
    console.log('✅ Dropped baptism_records');

    console.log('⏳ Dropping baptism_candidates...');
    await db.query('DROP TABLE IF EXISTS baptism_candidates CASCADE');
    console.log('✅ Dropped baptism_candidates\n');

    // Extract and run the baptism creation SQL from the migration
    // Find the exact CREATE TABLE statements
    const baptismCandidatesStart = fullSql.indexOf('CREATE TABLE IF NOT EXISTS baptism_candidates');
    const baptismRecordsStart = fullSql.indexOf('CREATE TABLE IF NOT EXISTS baptism_records');
    const nextCreateTable = fullSql.indexOf('CREATE TABLE', baptismRecordsStart + 1);

    if (baptismCandidatesStart === -1 || baptismRecordsStart === -1) {
      console.log('❌ Could not find baptism table definitions');
      process.exit(1);
    }

    const baptismCandidatesSql = fullSql.substring(baptismCandidatesStart, baptismRecordsStart).trim();
    const baptismRecordsSql = fullSql.substring(baptismRecordsStart, nextCreateTable).trim();

    console.log('⏳ Creating baptism_candidates table with correct schema...');
    await db.query(baptismCandidatesSql);
    console.log('✅ Created baptism_candidates table\n');

    console.log('⏳ Creating baptism_records table with correct schema...');
    await db.query(baptismRecordsSql);
    console.log('✅ Created baptism_records table\n');

    // Verify the schema
    const columnsCheck = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'baptism_candidates' 
      AND column_name IN ('first_name', 'surname', 'visitor_id', 'counseling_completed')
      ORDER BY column_name
    `);

    if (columnsCheck.rows.length === 4) {
      console.log('✅ All required columns exist in baptism_candidates!');
      console.log('✅ Schema fix completed successfully!');
      process.exit(0);
    } else {
      console.log('❌ Missing required columns:', ['first_name', 'surname', 'visitor_id', 'counseling_completed'].filter(col => !columnsCheck.rows.map(r => r.column_name).includes(col)));
      process.exit(1);
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

fixBaptismSchema();
