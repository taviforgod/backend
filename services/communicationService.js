import * as providerModel from '../models/communicationProviderModel.js';
import * as logModel from '../models/notificationLogModel.js';

// SMS Service using Twilio
class TwilioSMSService {
  constructor(config) {
    this.accountSid = config.accountSid;
    this.authToken = config.authToken;
    this.fromNumber = config.fromNumber;
    // In production, you'd initialize Twilio client here
    // this.client = require('twilio')(accountSid, authToken);
  }

  async send(to, message) {
    try {
      // Mock implementation - replace with actual Twilio API call
      console.log(`[TwilioSMS] Sending SMS to ${to}: ${message}`);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 100));

      return {
        success: true,
        messageId: `twilio_${Date.now()}`,
        cost: 0.01
      };
    } catch (error) {
      throw new Error(`Twilio SMS failed: ${error.message}`);
    }
  }
}

// Email Service using SendGrid
class SendGridEmailService {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.fromEmail = config.fromEmail;
    this.fromName = config.fromName || 'Church Management System';
    // In production, you'd initialize SendGrid client here
    // this.sg = require('@sendgrid/mail');
    // this.sg.setApiKey(apiKey);
  }

  async send(to, subject, htmlBody, textBody = null) {
    try {
      console.log(`[SendGrid] Sending email to ${to}: ${subject}`);

      // Mock implementation - replace with actual SendGrid API call
      await new Promise(resolve => setTimeout(resolve, 100));

      return {
        success: true,
        messageId: `sendgrid_${Date.now()}`
      };
    } catch (error) {
      throw new Error(`SendGrid email failed: ${error.message}`);
    }
  }
}

// AWS SES Email Service
class AWSSESEmailService {
  constructor(config) {
    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;
    this.region = config.region || 'us-east-1';
    this.fromEmail = config.fromEmail;
    // In production, you'd initialize AWS SES client here
  }

  async send(to, subject, htmlBody, textBody = null) {
    try {
      console.log(`[AWS SES] Sending email to ${to}: ${subject}`);

      // Mock implementation - replace with actual AWS SES API call
      await new Promise(resolve => setTimeout(resolve, 100));

      return {
        success: true,
        messageId: `ses_${Date.now()}`
      };
    } catch (error) {
      throw new Error(`AWS SES email failed: ${error.message}`);
    }
  }
}

// Firebase Cloud Messaging (Push Notifications)
class FirebasePushService {
  constructor(config) {
    this.serverKey = config.serverKey;
    // In production, you'd initialize Firebase Admin SDK here
  }

  async send(to, title, body, data = {}) {
    try {
      console.log(`[Firebase] Sending push to ${to}: ${title}`);

      // Mock implementation - replace with actual Firebase API call
      await new Promise(resolve => setTimeout(resolve, 100));

      return {
        success: true,
        messageId: `firebase_${Date.now()}`
      };
    } catch (error) {
      throw new Error(`Firebase push failed: ${error.message}`);
    }
  }
}

// Main Communication Service
class CommunicationService {
  constructor() {
    this.services = new Map();
  }

  // Initialize service instances
  async initializeServices() {
    try {
      const providers = await providerModel.getAllProviders();

      for (const provider of providers) {
        if (!provider.is_active) continue;

        switch (provider.provider_type) {
          case 'twilio':
            this.services.set(`sms_${provider.id}`, new TwilioSMSService(provider.config));
            break;
          case 'sendgrid':
            this.services.set(`email_${provider.id}`, new SendGridEmailService(provider.config));
            break;
          case 'aws_ses':
            this.services.set(`email_${provider.id}`, new AWSSESEmailService(provider.config));
            break;
          case 'firebase':
            this.services.set(`push_${provider.id}`, new FirebasePushService(provider.config));
            break;
        }
      }
    } catch (error) {
      console.error('Failed to initialize communication services:', error);
    }
  }

  // Send SMS
  async sendSMS(to, message, options = {}) {
    const smsServices = Array.from(this.services.entries())
      .filter(([key]) => key.startsWith('sms_'))
      .sort((a, b) => a[1].priority - b[1].priority); // Sort by priority

    for (const [key, service] of smsServices) {
      try {
        const result = await service.send(to, message);
        return result;
      } catch (error) {
        console.error(`SMS service ${key} failed:`, error);
        // Try next service
      }
    }

    throw new Error('All SMS services failed');
  }

  // Send Email
  async sendEmail(to, subject, htmlBody, textBody = null, options = {}) {
    const emailServices = Array.from(this.services.entries())
      .filter(([key]) => key.startsWith('email_'))
      .sort((a, b) => a[1].priority - b[1].priority); // Sort by priority

    for (const [key, service] of emailServices) {
      try {
        const result = await service.send(to, subject, htmlBody, textBody);
        return result;
      } catch (error) {
        console.error(`Email service ${key} failed:`, error);
        // Try next service
      }
    }

    throw new Error('All email services failed');
  }

  // Send Push Notification
  async sendPush(to, title, body, data = {}) {
    const pushServices = Array.from(this.services.entries())
      .filter(([key]) => key.startsWith('push_'));

    for (const [key, service] of pushServices) {
      try {
        const result = await service.send(to, title, body, data);
        return result;
      } catch (error) {
        console.error(`Push service ${key} failed:`, error);
        // Try next service
      }
    }

    throw new Error('All push services failed');
  }

  // Send notification via multiple channels
  async sendNotification(channels, recipient, content, options = {}) {
    const results = [];
    const errors = [];

    for (const channel of channels) {
      try {
        let result;

        switch (channel) {
          case 'sms':
            if (!recipient.phone) continue;
            result = await this.sendSMS(recipient.phone, content.body || content.message);
            break;

          case 'email':
            if (!recipient.email) continue;
            result = await this.sendEmail(
              recipient.email,
              content.subject || content.title,
              content.htmlBody || content.body,
              content.textBody
            );
            break;

          case 'push':
            if (!recipient.pushToken) continue;
            result = await this.sendPush(
              recipient.pushToken,
              content.title,
              content.body,
              content.data || {}
            );
            break;

          default:
            continue;
        }

        results.push({ channel, ...result });

        // Log successful send
        await logModel.createLog({
          church_id: options.church_id,
          notification_id: options.notification_id,
          recipient_user_id: recipient.user_id,
          recipient_member_id: recipient.member_id,
          channel,
          status: 'sent',
          subject: content.subject || content.title,
          body: content.body || content.message,
          sent_at: new Date(),
          metadata: { provider_result: result }
        });

      } catch (error) {
        console.error(`Failed to send ${channel} notification:`, error);
        errors.push({ channel, error: error.message });

        // Log failed send
        await logModel.createLog({
          church_id: options.church_id,
          notification_id: options.notification_id,
          recipient_user_id: recipient.user_id,
          recipient_member_id: recipient.member_id,
          channel,
          status: 'failed',
          subject: content.subject || content.title,
          body: content.body || content.message,
          error_message: error.message,
          metadata: { error_details: error }
        });
      }
    }

    return { results, errors };
  }
}

// Export singleton instance
const communicationService = new CommunicationService();

export default communicationService;
export { CommunicationService };