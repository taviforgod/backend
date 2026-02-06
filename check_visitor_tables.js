import db from './config/db.js';

async function checkVisitorTables() {
  try {
    console.log('🔍 Checking visitor-related tables...\n');

    const result = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE '%visitor%'
      ORDER BY table_name
    `);

    console.log('Visitor-related tables:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkVisitorTables();