import * as reportGeneratorModel from '../models/reportGeneratorModel.js';
import * as reportModel from '../models/reportingModel.js';
import { handleError } from '../utils/errorHandler.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Report Templates Management
export async function getReportTemplates(req, res) {
  try {
    const church_id = req.user?.church_id || req.query.church_id;
    const templates = await reportModel.getReportTemplates(church_id, {
      template_type: req.query.template_type,
      is_active: req.query.is_active !== 'false'
    });
    res.json(templates);
  } catch (err) {
    return handleError(res, 'getReportTemplates', err);
  }
}

export async function createReportTemplate(req, res) {
  try {
    const church_id = req.user?.church_id || req.body.church_id;
    const member = await import('../models/memberModel.js').then(m => m.getMemberByUserId(req.user?.userId, church_id));
    const created_by = member ? member.id : req.user?.id;

    const templateData = {
      ...req.body,
      church_id,
      created_by
    };

    const template = await reportModel.createReportTemplate(templateData);
    res.status(201).json({
      message: 'Report template created successfully',
      template
    });
  } catch (err) {
    return handleError(res, 'createReportTemplate', err);
  }
}

// Report Generation
export async function generateReport(req, res) {
  try {
    const { report_type, template_id, report_period_start, report_period_end, report_name, filters } = req.body;
    const church_id = req.user?.church_id || req.body.church_id;
    const member = await import('../models/memberModel.js').then(m => m.getMemberByUserId(req.user?.userId, church_id));
    const generated_by = member ? member.id : req.user?.id;

    // Generate the report data
    const reportData = await reportGeneratorModel.generateReport(report_type, {
      church_id,
      start_date: report_period_start,
      end_date: report_period_end,
      filters: filters || {}
    });

    // Save report record
    const reportRecord = await reportModel.createGeneratedReport({
      church_id,
      template_id,
      report_name: report_name || `${reportData.title} - ${report_period_start} to ${report_period_end}`,
      report_type,
      report_period_start,
      report_period_end,
      report_data: reportData,
      executive_summary: generateExecutiveSummaryText(reportData),
      key_insights: generateKeyInsights(reportData),
      generation_status: 'completed',
      generated_by
    });

    res.status(201).json({
      message: 'Report generated successfully',
      report: reportRecord,
      data: reportData
    });
  } catch (err) {
    return handleError(res, 'generateReport', err);
  }
}

// Report Retrieval
export async function getGeneratedReports(req, res) {
  try {
    const church_id = req.user?.church_id || req.query.church_id;
    const reports = await reportModel.getGeneratedReports(church_id, {
      report_type: req.query.report_type,
      generation_status: req.query.generation_status,
      template_id: req.query.template_id,
      limit: req.query.limit ? parseInt(req.query.limit) : 50
    });
    res.json(reports);
  } catch (err) {
    return handleError(res, 'getGeneratedReports', err);
  }
}

export async function getReportById(req, res) {
  try {
    const reportId = parseInt(req.params.id);
    const church_id = req.user?.church_id || req.query.church_id;
    const reports = await reportModel.getGeneratedReports(church_id, { limit: 1 });
    const report = reports.find(r => r.id === reportId);

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    res.json(report);
  } catch (err) {
    return handleError(res, 'getReportById', err);
  }
}

// Report Export
export async function exportReport(req, res) {
  try {
    const reportId = parseInt(req.params.id);
    const format = req.query.format || 'json';
    const church_id = req.user?.church_id || req.query.church_id;

    // Get report data
    const reports = await reportModel.getGeneratedReports(church_id, { limit: 1 });
    const report = reports.find(r => r.id === reportId);

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    switch (format) {
      case 'json':
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="report-${reportId}.json"`);
        res.json({
          report: report,
          data: report.report_data,
          summary: report.executive_summary,
          insights: report.key_insights
        });
        break;

      case 'csv':
        const csvData = convertReportToCSV(report);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="report-${reportId}.csv"`);
        res.send(csvData);
        break;

      case 'pdf':
        // For PDF generation, we'd need a library like puppeteer or pdfkit
        // For now, return JSON with PDF flag
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="report-${reportId}.pdf"`);
        res.json({
          message: 'PDF export would be implemented with a PDF generation library',
          report: report
        });
        break;

      default:
        res.status(400).json({ message: 'Unsupported export format' });
    }
  } catch (err) {
    return handleError(res, 'exportReport', err);
  }
}

// Quick Report Generation (no saving)
export async function generateQuickReport(req, res) {
  try {
    const { report_type, start_date, end_date, filters } = req.body;
    const church_id = req.user?.church_id || req.body.church_id;

    const reportData = await reportGeneratorModel.generateReport(report_type, {
      church_id,
      start_date,
      end_date,
      filters: filters || {}
    });

    res.json({
      message: 'Report generated successfully',
      report: reportData
    });
  } catch (err) {
    return handleError(res, 'generateQuickReport', err);
  }
}

// Report Analytics Dashboard
export async function getReportAnalytics(req, res) {
  try {
    const church_id = req.user?.church_id || req.query.church_id;

    // Get current month data for dashboard
    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const reportPeriod = {
      start_date: currentMonthStart.toISOString().split('T')[0],
      end_date: currentMonthEnd.toISOString().split('T')[0]
    };

    const currentData = await reportGeneratorModel.generateMonthlyOverviewReport(church_id, reportPeriod);

    // Get previous month for comparison
    const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    const prevReportPeriod = {
      start_date: prevMonthStart.toISOString().split('T')[0],
      end_date: prevMonthEnd.toISOString().split('T')[0]
    };

    const previousData = await reportGeneratorModel.generateMonthlyOverviewReport(church_id, prevReportPeriod);

    res.json({
      current_month: currentData,
      previous_month: previousData,
      trends: calculateTrends(currentData, previousData)
    });
  } catch (err) {
    return handleError(res, 'getReportAnalytics', err);
  }
}

// Scheduled Report Generation
export async function generateScheduledReports(req, res) {
  try {
    const church_id = req.user?.church_id || req.query.church_id;

    // Get all active templates that should auto-generate today
    const today = new Date();
    const currentDay = today.getDate();

    const templates = await reportModel.getReportTemplates(church_id, { is_active: true });

    const scheduledTemplates = templates.filter(template => {
      return template.auto_generate &&
             template.generation_schedule === 'monthly' &&
             template.generation_day === currentDay;
    });

    const results = [];

    for (const template of scheduledTemplates) {
      try {
        // Calculate report period (previous month for monthly reports)
        const reportEndDate = new Date(today.getFullYear(), today.getMonth(), 0);
        const reportStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);

        const reportPeriod = {
          start_date: reportStartDate.toISOString().split('T')[0],
          end_date: reportEndDate.toISOString().split('T')[0]
        };

        // Generate report
        const reportData = await reportGeneratorModel.generateReport(template.template_type, {
          church_id,
          start_date: reportPeriod.start_date,
          end_date: reportPeriod.end_date
        });

        // Save report record
        const reportRecord = await reportModel.createGeneratedReport({
          church_id,
          template_id: template.id,
          report_name: `${template.template_name} - ${reportPeriod.start_date} to ${reportPeriod.end_date}`,
          report_type: template.template_type,
          report_period_start: reportPeriod.start_date,
          report_period_end: reportPeriod.end_date,
          report_data: reportData,
          executive_summary: generateExecutiveSummaryText(reportData),
          key_insights: generateKeyInsights(reportData),
          generation_status: 'completed',
          email_recipients: template.email_recipients,
          generated_by: null
        });

        results.push({
          template_id: template.id,
          template_name: template.template_name,
          report_id: reportRecord.id,
          status: 'success'
        });

      } catch (err) {
        console.error(`Failed to generate report for template ${template.id}:`, err);
        results.push({
          template_id: template.id,
          template_name: template.template_name,
          status: 'failed',
          error: err.message
        });
      }
    }

    res.json({
      message: `Processed ${scheduledTemplates.length} scheduled reports`,
      results
    });
  } catch (err) {
    return handleError(res, 'generateScheduledReports', err);
  }
}

// Helper Functions

function generateExecutiveSummaryText(reportData) {
  if (reportData.title?.includes('Monthly Ministry Overview')) {
    const kpis = reportData.key_performance_indicators;
    return `EXECUTIVE SUMMARY - ${reportData.period.start_date} to ${reportData.period.end_date}

FINANCIAL PERFORMANCE:
• Total Giving: $${kpis.financial_health.total_giving?.toLocaleString()}
• Active Givers: ${kpis.financial_health.active_givers}

ATTENDANCE & GROWTH:
• Total Attendance: ${kpis.attendance_growth.total_attendance?.toLocaleString()}
• Average Weekly Attendance: ${kpis.attendance_growth.avg_weekly_attendance?.toFixed(0)}
• Visitor Ratio: ${kpis.attendance_growth.visitor_ratio?.toFixed(1)}%

MINISTRY HEALTH:
• Cell Health Score: ${kpis.ministry_health.cell_health_score?.toFixed(1)}/10
• Active Cells: ${kpis.ministry_health.active_cells}
• Cells Ready for Multiplication: ${kpis.ministry_health.multiplication_readiness}

LEADERSHIP DEVELOPMENT:
• Total Leaders in Pipeline: ${kpis.leadership_development.total_leaders}
• Ready for Multiplication: ${kpis.leadership_development.ready_for_multiplication}
• Average Leadership Score: ${kpis.leadership_development.avg_leadership_score?.toFixed(1)}

DISCIPLESHIP & SPIRITUAL GROWTH:
• Foundation School Completions: ${kpis.discipleship_growth.foundation_completions}
• Active Disciples: ${kpis.discipleship_growth.active_disciples}
• Baptism Candidates: ${kpis.discipleship_growth.baptism_candidates}

CRISIS CARE:
• Active Cases: ${kpis.crisis_care.active_cases}
• Critical Cases: ${kpis.crisis_care.critical_cases}
• Resolution Rate: ${kpis.crisis_care.resolution_rate?.toFixed(1)}%

OUTREACH IMPACT:
• New Visitors: ${kpis.outreach_impact.new_visitors}
• New Members: ${kpis.outreach_impact.new_members}
• Baptisms: ${kpis.outreach_impact.baptisms}`;
  }

  return 'Executive summary not available for this report type.';
}

function generateKeyInsights(reportData) {
  const insights = [];

  if (reportData.title?.includes('Giving Summary')) {
    if (reportData.summary?.total_amount > 0) {
      insights.push(`💰 Strong financial stewardship with $${reportData.summary.total_amount.toLocaleString()} in total giving`);
    }
    if (reportData.summary?.active_givers > 10) {
      insights.push(`👥 ${reportData.summary.active_givers} active givers showing strong congregational participation`);
    }
  }

  if (reportData.title?.includes('Attendance')) {
    if (reportData.attendance?.summary?.total_attendance > 0) {
      insights.push(`📊 ${reportData.attendance.summary.total_attendance.toLocaleString()} total attendance this period`);
    }
    if (reportData.growth?.summary?.total_conversions > 0) {
      insights.push(`🌱 ${reportData.growth.summary.total_conversions} new conversions showing evangelistic fruitfulness`);
    }
  }

  if (reportData.title?.includes('Cell Health')) {
    if (reportData.summary?.overall_health_score >= 7) {
      insights.push(`✅ Excellent cell health with ${reportData.summary.overall_health_score.toFixed(1)}/10 average score`);
    }
  }

  if (reportData.title?.includes('Leadership')) {
    if (reportData.pipeline_summary?.ready_for_multiplication > 0) {
      insights.push(`🚀 ${reportData.pipeline_summary.ready_for_multiplication} leaders ready for multiplication`);
    }
  }

  return insights.join('\n');
}

function convertReportToCSV(report) {
  // Simple CSV conversion - in production, you'd use a proper CSV library
  const lines = ['Report Title,Value', `${report.report_name},Generated on ${report.generated_date}`];

  // Add summary data
  if (report.report_data?.summary) {
    Object.entries(report.report_data.summary).forEach(([key, value]) => {
      lines.push(`${key},${value}`);
    });
  }

  return lines.join('\n');
}

function calculateTrends(current, previous) {
  const trends = {};

  if (current?.key_performance_indicators && previous?.key_performance_indicators) {
    const curr = current.key_performance_indicators;
    const prev = previous.key_performance_indicators;

    trends.financial = calculateTrend(curr.financial_health?.total_giving, prev.financial_health?.total_giving);
    trends.attendance = calculateTrend(curr.attendance_growth?.total_attendance, prev.attendance_growth?.total_attendance);
    trends.cell_health = calculateTrend(curr.ministry_health?.cell_health_score, prev.ministry_health?.cell_health_score);
    trends.leadership = calculateTrend(curr.leadership_development?.total_leaders, prev.leadership_development?.total_leaders);
    trends.discipleship = calculateTrend(curr.discipleship_growth?.foundation_completions, prev.discipleship_growth?.foundation_completions);
  }

  return trends;
}

function calculateTrend(current, previous) {
  if (!previous || previous === 0) return current > 0 ? 'up' : 'neutral';

  const change = ((current - previous) / previous) * 100;

  if (change > 10) return 'up';
  if (change < -10) return 'down';
  return 'neutral';
}