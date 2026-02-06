import db from './config/db.js';

async function checkCrisisTables() {
  try {
    console.log('🔍 Checking crisis tables schema...');

    // Check crisis_followup table
    const crisisResult = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'crisis_followup'
      ORDER BY ordinal_position
    `);

    console.log('crisis_followup columns:');
    crisisResult.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
    });

    // Check crisis_intervention_plans table
    const interventionResult = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'crisis_intervention_plans'
      ORDER BY ordinal_position
    `);

    console.log('\ncrisis_intervention_plans columns:');
    interventionResult.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
    });

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkCrisisTables();