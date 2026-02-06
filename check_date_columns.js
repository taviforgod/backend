import db from './config/db.js';

async function checkDateColumns() {
  try {
    console.log('🔍 Checking date column types...');

    // Check crisis_followups date columns
    const crisisResult = await db.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'crisis_followups'
      AND column_name IN ('date_reported', 'resolution_date', 'next_followup_date', 'closed_date')
      ORDER BY column_name
    `);

    console.log('crisis_followups date columns:');
    crisisResult.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.udt_name})`);
    });

    // Check some sample data
    const sampleData = await db.query(`
      SELECT id, date_reported, resolution_date
      FROM crisis_followups
      LIMIT 3
    `);

    console.log('\nSample data:');
    sampleData.rows.forEach(row => {
      console.log(`  - ID ${row.id}: date_reported=${row.date_reported} (${typeof row.date_reported}), resolution_date=${row.resolution_date} (${typeof row.resolution_date})`);
    });

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkDateColumns();