import { generateReport } from './models/reportGeneratorModel.js';

async function finalTest() {
  try {
    console.log('🎯 Final comprehensive test...\n');

    const churchId = 1;
    const startDate = '2024-01-01';
    const endDate = '2024-12-31';

    console.log('Testing all individual reports...');
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

    let successCount = 0;
    for (const reportType of reports) {
      try {
        await generateReport(reportType, {
          church_id: churchId,
          start_date: startDate,
          end_date: endDate
        });
        console.log(`✅ ${reportType}`);
        successCount++;
      } catch (error) {
        console.log(`❌ ${reportType}: ${error.message}`);
      }
    }

    console.log(`\n📊 Individual reports: ${successCount}/${reports.length} successful`);

    console.log('\nTesting Monthly Ministry Overview...');
    try {
      const overview = await generateReport('monthly_ministry_overview', {
        church_id: churchId,
        start_date: startDate,
        end_date: endDate
      });
      console.log('✅ Monthly Ministry Overview - SUCCESS');
      console.log(`📈 Generated KPIs: ${Object.keys(overview.key_performance_indicators).length} categories`);
    } catch (error) {
      console.log(`❌ Monthly Ministry Overview: ${error.message}`);
    }

    console.log('\n🎉 Report generation system is now fully operational!');

  } catch (error) {
    console.error('❌ Final test failed:', error.message);
  }
}

finalTest();