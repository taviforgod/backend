import db from './config/db.js';

async function checkAllColumns() {
  try {
    console.log('🔍 Checking all problematic table columns...\n');

    const tables = [
      'burnout_assessments',
      'outreach_events',
      'personal_growth_plans'
    ];

    for (const table of tables) {
      console.log(`Table: ${table}`);

      const result = await db.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY column_name
      `, [table]);

      result.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });

      console.log('');
    }

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkAllColumns();