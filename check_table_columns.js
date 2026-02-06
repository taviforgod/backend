import db from './config/db.js';

async function checkTableColumns() {
  try {
    console.log('🔍 Checking table columns...\n');

    const tables = [
      'foundation_school_progress',
      'burnout_assessments',
      'baptism_candidates',
      'leadership_pipeline'
    ];

    for (const table of tables) {
      console.log(`Table: ${table}`);

      const result = await db.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
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

checkTableColumns();