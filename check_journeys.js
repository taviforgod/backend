import db from './config/db.js';

async function checkJourneys() {
  try {
    console.log('🔍 Checking cell_visitor_journeys table...\n');

    const result = await db.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'cell_visitor_journeys'
      ORDER BY column_name
    `);

    console.log('cell_visitor_journeys columns:');
    result.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkJourneys();