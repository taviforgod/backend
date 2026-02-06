import db from './config/db.js';

async function checkRemainingIssues() {
  try {
    console.log('🔍 Checking remaining column issues...\n');

    const issues = [
      { table: 'foundation_school_progress', columns: ['module_number'] },
      { table: 'burnout_assessments', columns: ['depersonalization_score'] },
      { table: 'outreach_events', columns: ['event_status'] },
      { table: 'personal_growth_plans', columns: ['completion_percentage'] },
      { table: 'cell_visitor_movements', checkExists: true }
    ];

    for (const issue of issues) {
      if (issue.checkExists) {
        // Check if table exists
        const result = await db.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = $1
          )
        `, [issue.table]);

        if (result.rows[0].exists) {
          console.log(`✅ ${issue.table} - EXISTS`);
        } else {
          console.log(`❌ ${issue.table} - MISSING TABLE`);
        }
      } else {
        // Check columns
        for (const column of issue.columns) {
          const result = await db.query(`
            SELECT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = $1 AND column_name = $2
            )
          `, [issue.table, column]);

          if (result.rows[0].exists) {
            console.log(`✅ ${issue.table}.${column} - EXISTS`);
          } else {
            console.log(`❌ ${issue.table}.${column} - MISSING`);
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkRemainingIssues();