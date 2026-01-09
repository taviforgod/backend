import * as notificationModel from '../models/notificationModel.js';
import * as reminderModel from '../models/reminderModel.js';
import * as templateModel from '../models/notificationTemplateModel.js';
import communicationService from './communicationService.js';

class MemberService {
  // Send welcome notification to new member
  async sendWelcomeNotification(member, church) {
    try {
      const template = await templateModel.getTemplateByName(church.id, 'Welcome Email');
      if (!template) {
        console.log('No welcome template found, skipping welcome notification');
        return;
      }

      const welcomeContent = {
        title: template.subject_template || 'Welcome to Our Church!',
        body: template.body_template || 'Welcome to our church family!',
        htmlBody: template.body_template,
        data: {
          first_name: member.first_name,
          church_name: church.name,
          meeting_location: church.address || 'Our Church Location',
          service_times: 'Sundays 10:00 AM'
        }
      };

      // Determine channels based on member's contact info
      const channels = [];
      if (member.email) channels.push('email');
      if (member.contact_primary) channels.push('sms');
      channels.push('in_app'); // Always send in-app

      // Send notification
      const recipients = [{
        user_id: member.user_id,
        member_id: member.id,
        email: member.email,
        phone: member.contact_primary,
        first_name: member.first_name,
        last_name: member.surname
      }];

      await communicationService.sendNotification(
        channels,
        recipients[0],
        welcomeContent,
        { church_id: church.id, type: 'welcome' }
      );

      console.log(`Welcome notification sent to ${member.first_name} ${member.surname}`);
    } catch (error) {
      console.error('Failed to send welcome notification:', error);
    }
  }

  // Create birthday reminder for new member
  async createBirthdayReminder(member, church) {
    try {
      if (!member.date_of_birth) return;

      const reminderData = {
        church_id: church.id,
        title: `Birthday Reminder: ${member.first_name} ${member.surname}`,
        description: `Annual birthday reminder for ${member.first_name}`,
        reminder_type: 'birthday',
        target_type: 'user', // Send to church admin/leader
        target_id: null, // Could be set to pastor or admin user
        schedule_type: 'yearly',
        recurring_rule: {
          month: new Date(member.date_of_birth).getMonth() + 1,
          day: new Date(member.date_of_birth).getDate()
        },
        channels: ['email', 'sms'],
        is_active: true,
        created_by: member.user_id || 1 // System or member creator
      };

      await reminderModel.createReminder(reminderData);
      console.log(`Birthday reminder created for ${member.first_name} ${member.surname}`);
    } catch (error) {
      console.error('Failed to create birthday reminder:', error);
    }
  }

  // Create anniversary reminder (church membership anniversary)
  async createMembershipAnniversaryReminder(member, church) {
    try {
      if (!member.date_joined_church) return;

      const reminderData = {
        church_id: church.id,
        title: `Membership Anniversary: ${member.first_name} ${member.surname}`,
        description: `Annual membership anniversary reminder`,
        reminder_type: 'anniversary',
        target_type: 'user',
        target_id: null,
        schedule_type: 'yearly',
        recurring_rule: {
          month: new Date(member.date_joined_church).getMonth() + 1,
          day: new Date(member.date_joined_church).getDate()
        },
        channels: ['email'],
        is_active: true,
        created_by: member.user_id || 1
      };

      await reminderModel.createReminder(reminderData);
      console.log(`Membership anniversary reminder created for ${member.first_name} ${member.surname}`);
    } catch (error) {
      console.error('Failed to create membership anniversary reminder:', error);
    }
  }

  // Handle new member creation - called after member is created
  async handleNewMember(member, church) {
    try {
      // Send welcome notification
      await this.sendWelcomeNotification(member, church);

      // Create birthday reminder
      await this.createBirthdayReminder(member, church);

      // Create membership anniversary reminder
      await this.createMembershipAnniversaryReminder(member, church);

      console.log(`All automated processes completed for new member: ${member.first_name} ${member.surname}`);
    } catch (error) {
      console.error('Error in handleNewMember:', error);
      // Don't throw - we don't want to fail member creation
    }
  }

  // Handle member updates - check for important changes
  async handleMemberUpdate(oldMember, newMember, church) {
    try {
      // Check if email changed and send notification
      if (oldMember.email !== newMember.email && newMember.email) {
        await this.sendEmailUpdateNotification(newMember, church);
      }

      // Check if phone changed
      if (oldMember.contact_primary !== newMember.contact_primary && newMember.contact_primary) {
        await this.sendPhoneUpdateNotification(newMember, church);
      }

      // Check for baptism milestone
      if (!oldMember.date_baptized_immersion && newMember.date_baptized_immersion) {
        await this.sendBaptismCongratulation(newMember, church);
      }

      // Check for born again milestone
      if (!oldMember.date_born_again && newMember.date_born_again) {
        await this.sendBornAgainCongratulation(newMember, church);
      }

      // Check for foundation school completion
      if (!oldMember.foundation_school_grad_date && newMember.foundation_school_grad_date) {
        await this.sendFoundationSchoolCompletion(newMember, church);
      }

    } catch (error) {
      console.error('Error in handleMemberUpdate:', error);
    }
  }

  // Send foundation school completion notification
  async sendFoundationSchoolCompletion(member, church) {
    try {
      const content = {
        title: 'Foundation School Graduate!',
        body: `Congratulations to ${member.first_name} ${member.surname} for completing Foundation School!`,
        htmlBody: `<h1>Foundation School Graduate!</h1><p>Congratulations to ${member.first_name} ${member.surname} for completing our Foundation School program!</p><p>We're proud of your commitment to spiritual growth.</p><p>${church.name}</p>`
      };

      const channels = ['in_app'];
      if (member.email) channels.push('email');

      await communicationService.sendNotification(
        channels,
        {
          user_id: member.user_id,
          member_id: member.id,
          email: member.email,
          phone: member.contact_primary,
          first_name: member.first_name,
          last_name: member.surname
        },
        content,
        { church_id: church.id, type: 'milestone' }
      );

      console.log(`Foundation school completion notification sent for ${member.first_name} ${member.surname}`);
    } catch (error) {
      console.error('Failed to send foundation school completion:', error);
    }
  }

  // Send congratulation for baptism
  async sendBaptismCongratulation(member, church) {
    try {
      const content = {
        title: 'Congratulations on Your Baptism!',
        body: `Congratulations ${member.first_name}! We're so proud of you for taking this important step in your faith journey.`,
        htmlBody: `<h1>Congratulations ${member.first_name}!</h1><p>We're so proud of you for taking this important step in your faith journey.</p><p>${church.name} Family</p>`
      };

      const channels = [];
      if (member.email) channels.push('email');
      if (member.contact_primary) channels.push('sms');
      channels.push('in_app');

      await communicationService.sendNotification(
        channels,
        {
          user_id: member.user_id,
          member_id: member.id,
          email: member.email,
          phone: member.contact_primary,
          first_name: member.first_name,
          last_name: member.surname
        },
        content,
        { church_id: church.id, type: 'milestone' }
      );

      console.log(`Baptism congratulation sent to ${member.first_name} ${member.surname}`);
    } catch (error) {
      console.error('Failed to send baptism congratulation:', error);
    }
  }

  // Send congratulation for born again
  async sendBornAgainCongratulation(member, church) {
    try {
      const content = {
        title: 'Welcome to the Family of God!',
        body: `Praise God ${member.first_name}! Welcome to the family of believers.`,
        htmlBody: `<h1>Welcome to the Family of God!</h1><p>Praise God ${member.first_name}! Welcome to the family of believers.</p><p>${church.name} Family</p>`
      };

      const channels = ['in_app'];
      if (member.email) channels.push('email');

      await communicationService.sendNotification(
        channels,
        {
          user_id: member.user_id,
          member_id: member.id,
          email: member.email,
          phone: member.contact_primary,
          first_name: member.first_name,
          last_name: member.surname
        },
        content,
        { church_id: church.id, type: 'milestone' }
      );

      console.log(`Born again congratulation sent to ${member.first_name} ${member.surname}`);
    } catch (error) {
      console.error('Failed to send born again congratulation:', error);
    }
  }

  // Send notification when contact info changes
  async sendEmailUpdateNotification(member, church) {
    try {
      const content = {
        title: 'Email Address Updated',
        body: `Hi ${member.first_name}, your email address has been updated in our system.`,
        htmlBody: `<p>Hi ${member.first_name}, your email address has been updated in our system.</p>`
      };

      await communicationService.sendNotification(
        ['in_app', 'email'],
        {
          user_id: member.user_id,
          member_id: member.id,
          email: member.email,
          first_name: member.first_name,
          last_name: member.surname
        },
        content,
        { church_id: church.id, type: 'update' }
      );
    } catch (error) {
      console.error('Failed to send email update notification:', error);
    }
  }

  async sendPhoneUpdateNotification(member, church) {
    try {
      const content = {
        title: 'Phone Number Updated',
        body: `Hi ${member.first_name}, your phone number has been updated in our system.`,
        htmlBody: `<p>Hi ${member.first_name}, your phone number has been updated in our system.</p>`
      };

      await communicationService.sendNotification(
        ['in_app', 'sms'],
        {
          user_id: member.user_id,
          member_id: member.id,
          phone: member.contact_primary,
          first_name: member.first_name,
          last_name: member.surname
        },
        content,
        { church_id: church.id, type: 'update' }
      );
    } catch (error) {
      console.error('Failed to send phone update notification:', error);
    }
  }
}

// Export singleton instance
const memberService = new MemberService();
export default memberService;