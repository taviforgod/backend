import db from './config/db.js';

async function checkTableExists() {
  try {
    console.log('🔍 Checking if crisis tables exist...');

    const tables = ['crisis_followup', 'crisis_intervention_plans', 'crisis_cases'];

    for (const table of tables) {
      const result = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        )
      `, [table]);

      console.log(`${table}: ${result.rows[0].exists ? '✅ EXISTS' : '❌ MISSING'}`);
    }

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkTableExists();