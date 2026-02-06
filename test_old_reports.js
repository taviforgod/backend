import * as model from './models/reportingModel.js';

async function testOldReports() {
  try {
    console.log('🧪 Testing old reporting system...\n');

    const churchId = 1;
    const reportPeriod = {
      start_date: '2024-01-01',
      end_date: '2024-12-31'
    };

    console.log('Testing generateMonthlyReportData...');
    const reportData = await model.generateMonthlyReportData(churchId, reportPeriod);

    console.log('✅ Report generated successfully!');
    console.log('📊 Sections available:', Object.keys(reportData));

  } catch (error) {
    console.error('❌ Report generation failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testOldReports();