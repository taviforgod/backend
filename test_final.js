import { generateReport } from './models/reportGeneratorModel.js';

async function testFinal() {
  try {
    console.log('🎯 Final test of report generation...\n');

    const churchId = 1;
    const startDate = '2024-01-01';
    const endDate = '2024-12-31';

    console.log('Testing Monthly Ministry Overview Report...');
    const result = await generateReport('monthly_ministry_overview', {
      church_id: churchId,
      start_date: startDate,
      end_date: endDate
    });

    console.log('✅ Report generated successfully!');
    console.log('📊 Title:', result.title);
    console.log('📈 KPI Keys:', Object.keys(result.key_performance_indicators));

    // Test individual reports
    const reports = [
      'giving_summary',
      'attendance_report',
      'cell_health_assessment',
      'leadership_pipeline',
      'foundation_school_progress',
      'crisis_case_summary',
      'growth_plan_progress',
      'outreach_events'
    ];

    console.log('\n🧪 Testing individual reports...');
    for (const reportType of reports) {
      try {
        const report = await generateReport(reportType, {
          church_id: churchId,
          start_date: startDate,
          end_date: endDate
        });
        console.log(`✅ ${reportType} - OK`);
      } catch (error) {
        console.log(`❌ ${reportType} - FAILED: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Final test failed:', error.message);
  }
}

testFinal();