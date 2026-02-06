import db from './config/db.js';

async function checkCrisisFollowups() {
  try {
    console.log('🔍 Checking crisis_followups table schema...');

    const result = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'crisis_followups'
      ORDER BY ordinal_position
    `);

    console.log('crisis_followups columns:');
    result.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
    });

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkCrisisFollowups();