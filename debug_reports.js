import db from './config/db.js';

async function debugReports() {
  try {
    console.log('🔍 Debugging report generation...\n');

    const churchId = 1;
    const startDate = '2024-01-01';
    const endDate = '2024-12-31';

    const reportFunctions = [
      { name: 'Giving Summary', func: async () => {
        const m = await import('./models/reportGeneratorModel.js');
        return await m.generateReport('giving_summary', { church_id: churchId, start_date: startDate, end_date: endDate });
      }},
      { name: 'Attendance', func: async () => {
        const m = await import('./models/reportGeneratorModel.js');
        return await m.generateReport('attendance_report', { church_id: churchId, start_date: startDate, end_date: endDate });
      }},
      { name: 'Cell Health', func: async () => {
        const m = await import('./models/reportGeneratorModel.js');
        return await m.generateReport('cell_health_assessment', { church_id: churchId, start_date: startDate, end_date: endDate });
      }},
      { name: 'Leadership', func: async () => {
        const m = await import('./models/reportGeneratorModel.js');
        return await m.generateReport('leadership_pipeline', { church_id: churchId, start_date: startDate, end_date: endDate });
      }},
      { name: 'Discipleship', func: async () => {
        const m = await import('./models/reportGeneratorModel.js');
        return await m.generateReport('foundation_school_progress', { church_id: churchId, start_date: startDate, end_date: endDate });
      }},
      { name: 'Crisis Care', func: async () => {
        const m = await import('./models/reportGeneratorModel.js');
        return await m.generateReport('crisis_case_summary', { church_id: churchId, start_date: startDate, end_date: endDate });
      }},
      { name: 'Personal Growth', func: async () => {
        const m = await import('./models/reportGeneratorModel.js');
        return await m.generateReport('growth_plan_progress', { church_id: churchId, start_date: startDate, end_date: endDate });
      }},
      { name: 'Outreach', func: async () => {
        const m = await import('./models/reportGeneratorModel.js');
        return await m.generateReport('outreach_events', { church_id: churchId, start_date: startDate, end_date: endDate });
      }}
    ];

    for (const report of reportFunctions) {
      try {
        console.log(`🧪 Testing ${report.name}...`);
        const result = await report.func();
        console.log(`✅ ${report.name} - SUCCESS\n`);
      } catch (error) {
        console.log(`❌ ${report.name} - FAILED: ${error.message}\n`);
        console.log(`Stack trace: ${error.stack}\n`);
      }
    }

    console.log('🎯 Testing Monthly Overview Report...');
    try {
      const m = await import('./models/reportGeneratorModel.js');
      const result = await m.generateReport('monthly_ministry_overview', { church_id: churchId, start_date: startDate, end_date: endDate });
      console.log('✅ Monthly Overview - SUCCESS');
    } catch (error) {
      console.log(`❌ Monthly Overview - FAILED: ${error.message}`);
      console.log(`Stack trace: ${error.stack}`);
    }

  } catch (error) {
    console.error('❌ Debug script failed:', error.message);
  }
}

debugReports();