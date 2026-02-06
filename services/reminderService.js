import * as reminderModel from '../models/reminderModel.js';
import * as memberModel from '../models/memberModel.js';
import * as userModel from '../models/userModel.js';
import communicationService from './communicationService.js';
import db from '../config/db.js';

class ReminderService {
  // Generate follow-up reminders for members not contacted recently
  async generateFollowupReminders(churchId) {
    try {
      // Find members who haven't been followed up with in 30+ days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const membersNeedingFollowup = await db.query(`
        SELECT m.*, u.email as user_email
        FROM members m
        LEFT JOIN users u ON m.user_id = u.id
        WHERE m.church_id = $1
          AND (m.last_followup_date IS NULL OR m.last_followup_date < $2)
          AND m.member_status_id IN (
            SELECT id FROM member_statuses WHERE name IN ('active', 'inactive')
          )
        ORDER BY m.last_followup_date ASC NULLS FIRST
        LIMIT 10
      `, [churchId, thirtyDaysAgo]);

      if (membersNeedingFollowup.rows.length === 0) return;

      // Find pastors/leaders to notify
      const pastors = await this.getRoleUsers(churchId, 'pastor');

      if (pastors.length === 0) return;

      // Create notification content
      const memberList = membersNeedingFollowup.rows.map(member =>
        `${member.first_name} ${member.surname} (Last contact: ${member.last_followup_date || 'Never'})`
      ).join('</li><li>');

      const content = {
        title: `${membersNeedingFollowup.rows.length} Members Need Follow-up`,
        body: `Members haven't been followed up with in the last 30 days`,
        htmlBody: `
          <h2>Members Needing Follow-up</h2>
          <p>The following members haven't been contacted in the last 30 days:</p>
          <ul><li>${memberList}</li></ul>
          <p>Please reach out to ensure their spiritual well-being.</p>
        `,
        data: {
          member_count: membersNeedingFollowup.rows.length,
          church_name: 'Your Church'
        }
      };

      // Send to all pastors
      for (const pastor of pastors) {
        await communicationService.sendNotification(
          ['email', 'in_app'],
          pastor,
          content,
          { church_id: churchId, type: 'followup_alert' }
        );
      }

      console.log(`Follow-up reminders sent to ${pastors.length} pastors for ${membersNeedingFollowup.rows.length} members`);
    } catch (error) {
      console.error('Error generating follow-up reminders:', error);
    }
  }

  // Generate crisis care alerts
  async generateCrisisAlerts(churchId) {
    try {
      // Find active crisis followups that need attention
      const activeCrises = await db.query(`
        SELECT cf.*, m.first_name, m.surname, m.contact_primary, m.email,
               u.email as user_email
        FROM crisis_followups cf
        JOIN members m ON cf.member_id = m.id
        LEFT JOIN users u ON m.user_id = u.id
        WHERE cf.church_id = $1
          AND cf.status = 'active'
          AND cf.created_at > NOW() - INTERVAL '7 days'
        ORDER BY cf.urgency DESC, cf.created_at DESC
      `, [churchId]);

      if (activeCrises.rows.length === 0) return;

      // Find pastors/leaders to notify
      const pastors = await this.getRoleUsers(churchId, 'pastor');

      if (pastors.length === 0) return;

      // Send alerts for each crisis
      for (const crisis of activeCrises.rows) {
        const content = {
          title: `Crisis Alert: ${crisis.first_name} ${crisis.surname}`,
          body: `${crisis.crisis_type}: ${crisis.description}`,
          htmlBody: `
            <h2>Urgent: Crisis Care Needed</h2>
            <p><strong>Member:</strong> ${crisis.first_name} ${crisis.surname}</p>
            <p><strong>Type:</strong> ${crisis.crisis_type}</p>
            <p><strong>Description:</strong> ${crisis.description}</p>
            <p><strong>Urgency:</strong> ${crisis.urgency}</p>
            <p>Please provide immediate pastoral care and support.</p>
          `,
          data: {
            member_name: `${crisis.first_name} ${crisis.surname}`,
            crisis_type: crisis.crisis_type,
            crisis_description: crisis.description,
            urgency: crisis.urgency
          }
        };

        // Send to all pastors
        for (const pastor of pastors) {
          await communicationService.sendNotification(
            ['email', 'sms', 'push'],
            pastor,
            content,
            { church_id: churchId, type: 'crisis_alert', priority: 'high' }
          );
        }
      }

      console.log(`Crisis alerts sent for ${activeCrises.rows.length} active cases`);
    } catch (error) {
      console.error('Error generating crisis alerts:', error);
    }
  }

  // Generate report submission reminders
  async generateReportReminders(churchId) {
    try {
      // Check for pending weekly reports
      const pendingReports = await db.query(`
        SELECT wr.*, m.first_name, m.surname, u.email as user_email
        FROM weekly_reports wr
        JOIN members m ON wr.member_id = m.id
        LEFT JOIN users u ON m.user_id = u.id
        WHERE wr.church_id = $1
          AND wr.status = 'pending'
          AND wr.due_date < NOW() + INTERVAL '2 days'
          AND wr.due_date > NOW()
        ORDER BY wr.due_date ASC
      `, [churchId]);

      // Send reminders for each pending report
      for (const report of pendingReports.rows) {
        const content = {
          title: 'Report Submission Reminder',
          body: `Your ${report.report_type} report is due on ${new Date(report.due_date).toLocaleDateString()}`,
          htmlBody: `
            <h2>Report Submission Reminder</h2>
            <p>Dear ${report.first_name},</p>
            <p>This is a reminder that your <strong>${report.report_type}</strong> report is due by <strong>${new Date(report.due_date).toLocaleDateString()}</strong>.</p>
            <p>Please submit your report through the church management system.</p>
            <p>Thank you for your timely submission.</p>
          `,
          data: {
            recipient_name: report.first_name,
            report_type: report.report_type,
            due_date: new Date(report.due_date).toLocaleDateString()
          }
        };

        await communicationService.sendNotification(
          ['email', 'in_app'],
          {
            user_id: report.user_id,
            member_id: report.member_id,
            email: report.user_email,
            first_name: report.first_name,
            last_name: report.surname
          },
          content,
          { church_id: churchId, type: 'report_reminder' }
        );
      }

      if (pendingReports.rows.length > 0) {
        console.log(`Report reminders sent for ${pendingReports.rows.length} pending reports`);
      }
    } catch (error) {
      console.error('Error generating report reminders:', error);
    }
  }

  // Generate absentee follow-up reminders
  async generateAbsenteeFollowupReminders(churchId) {
    try {
      // Get pending follow-ups that are due today or overdue
      const pendingFollowups = await db.query(`
        SELECT af.*, m.first_name, m.surname, m.contact_primary, m.email,
               assignee.first_name as assignee_first_name, assignee.surname as assignee_surname,
               assignee.contact_primary as assignee_contact
        FROM absentee_followups af
        JOIN members m ON af.member_id = m.id
        LEFT JOIN members assignee ON af.assigned_to = assignee.id
        WHERE af.church_id = $1
          AND af.status IN ('pending', 'contacted')
          AND af.due_date <= CURRENT_DATE
        ORDER BY af.due_date ASC, af.priority_level DESC
      `, [churchId]);

      if (pendingFollowups.rows.length === 0) return;

      // Group by assignee and send notifications
      const byAssignee = {};
      pendingFollowups.rows.forEach(followup => {
        const assigneeId = followup.assigned_to;
        if (!byAssignee[assigneeId]) {
          byAssignee[assigneeId] = {
            assignee: {
              user_id: assigneeId,
              member_id: assigneeId,
              email: followup.assignee_email || null,
              first_name: followup.assignee_first_name,
              last_name: followup.assignee_surname
            },
            followups: []
          };
        }
        byAssignee[assigneeId].followups.push(followup);
      });

      // Send notifications to each assignee
      for (const [assigneeId, data] of Object.entries(byAssignee)) {
        const { assignee, followups } = data;

        // Skip if no assignee
        if (!assigneeId) continue;

        const overdueCount = followups.filter(f => f.due_date < new Date()).length;

        const content = {
          title: `${followups.length} Follow-up${followups.length > 1 ? 's' : ''} Due Today`,
          body: `${followups.length} absentee follow-up${followups.length > 1 ? 's' : ''} need${followups.length === 1 ? 's' : ''} your attention${overdueCount > 0 ? ` (${overdueCount} overdue)` : ''}`,
          htmlBody: `
            <h2>Follow-up Reminders</h2>
            <p>Dear ${assignee.first_name},</p>
            <p>You have <strong>${followups.length}</strong> absentee follow-up${followups.length > 1 ? 's' : ''} that need${followups.length === 1 ? 's' : ''} your attention:</p>
            <ul>
              ${followups.map(f => `
                <li>
                  <strong>${f.first_name} ${f.surname}</strong>
                  (${f.consecutive_absences} consecutive absences)
                  - Due: ${new Date(f.due_date).toLocaleDateString()}
                  ${f.due_date < new Date() ? '<span style="color: red;">[OVERDUE]</span>' : ''}
                </li>
              `).join('')}
            </ul>
            <p>Please contact these members and update their follow-up records.</p>
          `,
          data: {
            followup_count: followups.length,
            overdue_count: overdueCount,
            assignee_name: assignee.first_name
          }
        };

        await communicationService.sendNotification(
          ['email', 'in_app'],
          assignee,
          content,
          { church_id: churchId, type: 'absentee_followup_reminder' }
        );
      }

      console.log(`Absentee follow-up reminders sent to ${Object.keys(byAssignee).length} assignee(s) for ${pendingFollowups.rows.length} follow-ups`);
    } catch (error) {
      console.error('Error generating absentee follow-up reminders:', error);
    }
  }

  // Generate foundation school progress reminders
  async generateFoundationSchoolReminders(churchId) {
    try {
      // Find foundation school students and their progress
      const foundationStudents = await db.query(`
        SELECT m.*, u.email as user_email,
               EXTRACT(EPOCH FROM (NOW() - m.foundation_school_start_date))/86400 as days_enrolled
        FROM members m
        LEFT JOIN users u ON m.user_id = u.id
        WHERE m.church_id = $1
          AND m.foundation_school_start_date IS NOT NULL
          AND m.foundation_school_grad_date IS NULL
        ORDER BY m.foundation_school_start_date ASC
      `, [churchId]);

      if (foundationStudents.rows.length === 0) return;

      // Find foundation school coordinators
      const coordinators = await this.getRoleUsers(churchId, 'foundation_coordinator');

      if (coordinators.length === 0) return;

      // Group students by progress milestones
      const progressReport = {
        total_students: foundationStudents.rows.length,
        new_students: foundationStudents.rows.filter(s => s.days_enrolled < 30).length,
        mid_term: foundationStudents.rows.filter(s => s.days_enrolled >= 30 && s.days_enrolled < 90).length,
        long_term: foundationStudents.rows.filter(s => s.days_enrolled >= 90).length
      };

      const content = {
        title: 'Foundation School Monthly Progress Report',
        body: `${progressReport.total_students} students enrolled. New: ${progressReport.new_students}, Mid-term: ${progressReport.mid_term}, Long-term: ${progressReport.long_term}`,
        htmlBody: `
          <h2>Foundation School Progress Report</h2>
          <p>Monthly update on our foundation school students:</p>
          <ul>
            <li><strong>Total Students:</strong> ${progressReport.total_students}</li>
            <li><strong>New Students (0-30 days):</strong> ${progressReport.new_students}</li>
            <li><strong>Mid-term (30-90 days):</strong> ${progressReport.mid_term}</li>
            <li><strong>Long-term (90+ days):</strong> ${progressReport.long_term}</li>
          </ul>
          <p>Please review their progress and provide necessary guidance and support.</p>
        `,
        data: {
          pastor_name: 'Coordinator',
          student_count: progressReport.total_students,
          completion_date: 'Ongoing'
        }
      };

      // Send to coordinators
      for (const coordinator of coordinators) {
        await communicationService.sendNotification(
          ['email', 'in_app'],
          coordinator,
          content,
          { church_id: churchId, type: 'foundation_school_progress' }
        );
      }

      console.log(`Foundation school progress report sent to ${coordinators.length} coordinators`);
    } catch (error) {
      console.error('Error generating foundation school reminders:', error);
    }
  }

  // Helper method to get users by role
  async getRoleUsers(churchId, roleName) {
    try {
      const users = await db.query(`
        SELECT DISTINCT u.id as user_id, u.email, u.name,
               m.id as member_id, m.first_name, m.surname
        FROM users u
        JOIN members m ON u.id = m.user_id
        JOIN user_roles ur ON u.id = ur.user_id
        JOIN roles r ON ur.role_id = r.id
        WHERE m.church_id = $1 AND r.name = $2
      `, [churchId, roleName]);

      return users.rows.map(user => ({
        user_id: user.user_id,
        member_id: user.member_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.surname
      }));
    } catch (error) {
      console.error('Error getting role users:', error);
      return [];
    }
  }

  // Main method to run all automated reminder checks
  async runAutomatedReminders(churchId) {
    console.log(`Running automated reminders for church ${churchId}`);

    await Promise.all([
      this.generateFollowupReminders(churchId),
      this.generateCrisisAlerts(churchId),
      this.generateReportReminders(churchId),
      this.generateFoundationSchoolReminders(churchId),
      this.generateAbsenteeFollowupReminders(churchId)
    ]);

    console.log('Automated reminders completed');
  }
}

const reminderService = new ReminderService();
export default reminderService;