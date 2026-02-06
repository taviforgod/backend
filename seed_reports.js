import db from './config/db.js';

// Sample report data for testing
const sampleReports = [
  {
    church_id: 1,
    template_id: 1,
    report_name: 'Monthly Giving Report',
    report_type: 'giving_summary',
    report_period_start: '2024-01-01',
    report_period_end: '2024-01-31',
    generation_status: 'completed',
    generated_by: 1,
    report_data: JSON.stringify({
      summary: {
        totalGiving: 45678.90,
        tithes: 34259.17,
        offerings: 11419.73,
        activeGivers: 234,
        averageGift: 195.12,
        trend: 'up'
      },
      breakdown: [
        { category: 'Tithes', amount: 34259.17, percentage: 75, trend: 'up' },
        { category: 'Offerings', amount: 11419.73, percentage: 25, trend: 'stable' }
      ]
    })
  },
  {
    church_id: 1,
    template_id: 2,
    report_name: 'Attendance Analytics',
    report_type: 'attendance_report',
    report_period_start: '2024-01-01',
    report_period_end: '2024-01-31',
    generation_status: 'completed',
    generated_by: 1,
    report_data: JSON.stringify({
      summary: {
        totalAttendance: 1247,
        averageWeekly: 311,
        visitors: 89,
        firstTimers: 34,
        memberAttendance: 1158,
        growthRate: 3.2
      }
    })
  },
  {
    church_id: 1,
    template_id: 3,
    report_name: 'Cell Health Assessment',
    report_type: 'cell_health_assessment',
    report_period_start: '2024-01-01',
    report_period_end: '2024-01-31',
    generation_status: 'in_progress',
    generated_by: 1,
    report_data: JSON.stringify({
      summary: {
        averageHealthScore: 7.8,
        totalCells: 45,
        healthyCells: 38
      }
    })
  }
];

// Sample report templates
const sampleTemplates = [
  {
    church_id: 1,
    template_name: 'Monthly Giving Report',
    template_type: 'giving_summary',
    description: 'Comprehensive giving analysis including tithes, offerings, and trends',
    report_sections: JSON.stringify(['summary', 'breakdown', 'trends', 'insights']),
    default_filters: JSON.stringify({ dateRange: 'last30days' }),
    auto_generate: true,
    generation_schedule: 'monthly',
    generation_day: 1,
    created_by: 1
  },
  {
    church_id: 1,
    template_name: 'Attendance Analytics',
    template_type: 'attendance_report',
    description: 'Weekly attendance patterns, visitor tracking, and growth metrics',
    report_sections: JSON.stringify(['summary', 'breakdown', 'trends', 'insights']),
    default_filters: JSON.stringify({ dateRange: 'last30days' }),
    auto_generate: true,
    generation_schedule: 'weekly',
    generation_day: 1,
    created_by: 1
  }
];

async function seedReports() {
  try {
    console.log('Seeding sample report data...');

    // Ensure churches table has data
    await db.query(`
      INSERT INTO churches (id, name) VALUES 
      (1, 'Test Church')
      ON CONFLICT (id) DO NOTHING
    `);

    // Ensure members table has data for references
    await db.query(`
      INSERT INTO members (id, church_id, first_name, surname, email, created_at) VALUES 
      (1, 1, 'Admin', 'User', 'admin@test.com', NOW())
      ON CONFLICT (id) DO NOTHING
    `);

    // Clear existing data
    await db.query('DELETE FROM generated_reports WHERE church_id = 1');
    await db.query('DELETE FROM report_templates WHERE church_id = 1');

    // Insert sample templates
    for (const template of sampleTemplates) {
      await db.query(`
        INSERT INTO report_templates (
          church_id, template_name, template_type, description, 
          auto_generate, generation_schedule, generation_day, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        template.church_id,
        template.template_name,
        template.template_type,
        template.description,
        template.auto_generate,
        template.generation_schedule,
        template.generation_day,
        template.created_by
      ]);
    }

    // Insert sample reports
    for (const report of sampleReports) {
      await db.query(`
        INSERT INTO generated_reports (
          church_id, template_id, report_name, report_type, report_period_start,
          report_period_end, report_data, generation_status, generated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        report.church_id,
        report.template_id,
        report.report_name,
        report.report_type,
        report.report_period_start,
        report.report_period_end,
        report.report_data,
        report.generation_status,
        report.generated_by
      ]);
    }

    console.log('Sample report data seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding reports:', error);
    process.exit(1);
  }
}

seedReports();
