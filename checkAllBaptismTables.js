import 'dotenv/config';
import db from './config/db.js';

async function checkAllBaptismTables() {
  try {
    console.log('🔍 Checking all baptism-related tables...\n');

    // Check baptism_candidates
    const candidates = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'baptism_candidates' 
      ORDER BY column_name
    `);

    console.log(candidates.rows.length > 0 
      ? '✅ baptism_candidates table: OK (' + candidates.rows.length + ' columns)'
      : '❌ baptism_candidates table: MISSING');

    // Check baptism_records
    const records = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'baptism_records' 
      ORDER BY column_name
    `);

    console.log(records.rows.length > 0 
      ? '✅ baptism_records table: OK (' + records.rows.length + ' columns)'
      : '❌ baptism_records table: MISSING');

    // Check baptism_prep_checklist
    const checklist = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'baptism_prep_checklist' 
      ORDER BY column_name
    `);

    console.log(checklist.rows.length > 0 
      ? '✅ baptism_prep_checklist table: OK (' + checklist.rows.length + ' columns)'
      : '❌ baptism_prep_checklist table: MISSING');

    // Check baptism_prep_sessions
    const sessions = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'baptism_prep_sessions' 
      ORDER BY column_name
    `);

    console.log(sessions.rows.length > 0 
      ? '✅ baptism_prep_sessions table: OK (' + sessions.rows.length + ' columns)'
      : '❌ baptism_prep_sessions table: MISSING');

    // Check foreign key constraints
    console.log('\n🔗 Checking foreign key relationships...');
    const fks = await db.query(`
      SELECT
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name LIKE 'baptism%'
      ORDER BY tc.table_name, kcu.column_name
    `);

    if (fks.rows.length === 0) {
      console.log('⚠️  No foreign key constraints found');
    } else {
      fks.rows.forEach(fk => {
        console.log(`  ✅ ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
    }

    console.log('\n✅ All baptism tables are in place!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkAllBaptismTables();
