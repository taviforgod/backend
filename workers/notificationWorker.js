import { Worker } from 'bullmq';
import {
  processWeeklyFollowupReminders,
  processCrisisAlerts,
  processReportReminders,
  processFoundationSchoolReminders,
  processAbsenteeFollowupReminders
} from '../jobs/scheduler.js';

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Create worker to process automated reminder jobs
export const notificationWorker = new Worker(
  'notifications',
  async (job) => {
    console.log(`Processing job: ${job.name} for church ${job.data.church_id}`);

    try {
      switch (job.name) {
        case 'weekly-followup-reminders':
          await processWeeklyFollowupReminders(job);
          break;
        case 'crisis-alerts':
          await processCrisisAlerts(job);
          break;
        case 'report-reminders':
          await processReportReminders(job);
          break;
        case 'foundation-school-reminders':
          await processFoundationSchoolReminders(job);
          break;
        case 'absentee-followup-reminders':
          await processAbsenteeFollowupReminders(job);
          break;
        case 'daily-digest':
          // Placeholder for daily digest processing
          console.log('Processing daily digest for church:', job.data.church_id);
          break;
        default:
          console.log(`Unknown job type: ${job.name}`);
      }
    } catch (error) {
      console.error(`Error processing job ${job.name}:`, error);
      throw error; // Re-throw to mark job as failed
    }
  },
  {
    connection: { url: REDIS_URL },
    concurrency: 5, // Process up to 5 jobs simultaneously
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 50 // Keep last 50 failed jobs
  }
);

// Event listeners for monitoring
notificationWorker.on('completed', (job) => {
  console.log(`Job ${job.id} (${job.name}) completed successfully`);
});

notificationWorker.on('failed', (job, err) => {
  console.error(`Job ${job.id} (${job.name}) failed with error: ${err.message}`);
});

notificationWorker.on('stalled', (jobId) => {
  console.warn(`Job ${jobId} stalled`);
});

console.log('Notification worker started and listening for jobs...');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down notification worker...');
  await notificationWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Shutting down notification worker...');
  await notificationWorker.close();
  process.exit(0);
});