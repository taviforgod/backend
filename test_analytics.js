import db from './config/db.js';

async function testAnalytics() {
  try {
    console.log('🧪 Testing analytics dashboard...');

    // Simulate what the getReportAnalytics controller does
    const church_id = 1;
    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const reportPeriod = {
      start_date: currentMonthStart.toISOString().split('T')[0],
      end_date: currentMonthEnd.toISOString().split('T')[0]
    };

    console.log('Testing current month report generation...');
    const { generateReport } = await import('./models/reportGeneratorModel.js');
    const currentData = await generateReport('monthly_ministry_overview', {
      church_id,
      start_date: reportPeriod.start_date,
      end_date: reportPeriod.end_date
    });

    console.log('✅ Analytics test successful!');
    console.log('📊 Report generated with keys:', Object.keys(currentData));

  } catch (error) {
    console.error('❌ Analytics test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testAnalytics();