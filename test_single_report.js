import db from './config/db.js';

async function testSingleReport() {
  try {
    console.log('🧪 Testing single report function...');

    // Test the leadership report directly since that's one of the simpler ones
    const churchId = 1;
    const startDate = '2024-01-01';
    const endDate = '2024-12-31';

    console.log('Testing leadership report...');
    const leadershipQuery = `
      SELECT
        COUNT(*) as total_leaders,
        COUNT(*) FILTER (WHERE ready_for_multiplication = true) as ready_for_multiplication,
        AVG(COALESCE(leadership_potential, 0) + COALESCE(teaching_ability, 0) + COALESCE(evangelism_skills, 0) + COALESCE(discipleship_capability, 0) + COALESCE(administrative_skills, 0)) / 5.0 as avg_leadership_score
      FROM leadership_pipeline
      WHERE church_id = $1
    `;

    console.log('Running query...');
    const result = await db.query(leadershipQuery, [churchId]);
    console.log('✅ Query successful:', result.rows[0]);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testSingleReport();