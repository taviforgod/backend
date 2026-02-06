import db from './config/db.js';

async function checkCrisisRelated() {
  try {
    console.log('🔍 Checking crisis-related tables...');

    const result = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'crisis_%'
      ORDER BY table_name
    `);

    console.log('Crisis-related tables:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkCrisisRelated();