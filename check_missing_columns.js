import db from './config/db.js';

async function checkMissingColumns() {
  try {
    console.log('🔍 Checking missing columns...\n');

    const checks = [
      {
        table: 'foundation_school_progress',
        columns: ['current_module']
      },
      {
        table: 'burnout_assessments',
        columns: ['emotional_exhaustion_score']
      },
      {
        table: 'baptism_candidates',
        columns: ['baptism_type']
      },
      {
        table: 'leadership_pipeline',
        columns: ['leadership_score']
      }
    ];

    for (const check of checks) {
      console.log(`Checking table: ${check.table}`);

      for (const column of check.columns) {
        try {
          const result = await db.query(`
            SELECT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = $1 AND column_name = $2
            ) as exists
          `, [check.table, column]);

          if (result.rows[0].exists) {
            console.log(`  ✅ ${column} - EXISTS`);
          } else {
            console.log(`  ❌ ${column} - MISSING`);
          }
        } catch (error) {
          console.log(`  ❌ ${column} - ERROR: ${error.message}`);
        }
      }

      console.log('');
    }

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkMissingColumns();