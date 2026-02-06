import 'dotenv/config';
import db from './config/db.js';

async function checkBaptismTables() {
  try {
    // Check if baptism_candidates table exists
    const baptismCandidatesCheck = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'baptism_candidates' 
      ORDER BY column_name
    `);

    if (baptismCandidatesCheck.rows.length === 0) {
      console.log('❌ baptism_candidates table does not exist');
      process.exit(1);
    }

    console.log('✅ baptism_candidates table exists with columns:');
    baptismCandidatesCheck.rows.forEach(col => console.log(`  - ${col.column_name}`));

    // Check if baptism_records table exists
    const baptismRecordsCheck = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'baptism_records' 
      ORDER BY column_name
    `);

    if (baptismRecordsCheck.rows.length === 0) {
      console.log('\n❌ baptism_records table does not exist');
      process.exit(1);
    }

    console.log('\n✅ baptism_records table exists with columns:');
    baptismRecordsCheck.rows.forEach(col => console.log(`  - ${col.column_name}`));

    console.log('\n✅ All baptism tables exist!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkBaptismTables();
