import { Queue } from "bullmq";
import reminderService from "../services/reminderService.js";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const queue = new Queue("notifications", { connection: { url: REDIS_URL } });

// Example: Add a repeatable digest job for all churches
export async function setupRepeatableDigest(churchId) {
  await queue.add(
    "daily-digest",
    { church_id: churchId },
    {
      repeat: { cron: "0 7 * * *" }, // every day 7am
      removeOnComplete: true
    }
  );
  console.log(`Repeatable digest job scheduled for church ${churchId}`);
}

// Weekly follow-up reminders (Mondays at 10am)
export async function setupWeeklyFollowupReminders(churchId) {
  await queue.add(
    "weekly-followup-reminders",
    { church_id: churchId },
    {
      repeat: { cron: "0 10 * * 1" }, // every Monday 10am
      removeOnComplete: true
    }
  );
  console.log(`Weekly follow-up reminders scheduled for church ${churchId}`);
}

// Daily crisis alerts check (every 4 hours during business hours)
export async function setupCrisisAlerts(churchId) {
  await queue.add(
    "crisis-alerts",
    { church_id: churchId },
    {
      repeat: { cron: "0 */4 8-18 * * *" }, // every 4 hours, 8am-6pm
      removeOnComplete: true
    }
  );
  console.log(`Crisis alerts monitoring scheduled for church ${churchId}`);
}

// Report submission reminders (Fridays at 5pm)
export async function setupReportReminders(churchId) {
  await queue.add(
    "report-reminders",
    { church_id: churchId },
    {
      repeat: { cron: "0 17 * * 5" }, // every Friday 5pm
      removeOnComplete: true
    }
  );
  console.log(`Report submission reminders scheduled for church ${churchId}`);
}

// Monthly foundation school progress (15th of every month at 9am)
export async function setupFoundationSchoolReminders(churchId) {
  await queue.add(
    "foundation-school-reminders",
    { church_id: churchId },
    {
      repeat: { cron: "0 9 15 * *" }, // 15th of every month 9am
      removeOnComplete: true
    }
  );
  console.log(`Foundation school reminders scheduled for church ${churchId}`);
}

// Daily absentee follow-up reminders (weekdays at 9am)
export async function setupAbsenteeFollowupReminders(churchId) {
  await queue.add(
    "absentee-followup-reminders",
    { church_id: churchId },
    {
      repeat: { cron: "0 9 * * 1-5" }, // weekdays 9am
      removeOnComplete: true
    }
  );
  console.log(`Absentee follow-up reminders scheduled for church ${churchId}`);
}

// Setup all automated reminders for a church
export async function setupAllAutomatedReminders(churchId) {
  try {
    await setupWeeklyFollowupReminders(churchId);
    await setupCrisisAlerts(churchId);
    await setupReportReminders(churchId);
    await setupFoundationSchoolReminders(churchId);
    await setupAbsenteeFollowupReminders(churchId);
    console.log(`All automated reminders set up for church ${churchId}`);
  } catch (error) {
    console.error(`Error setting up automated reminders for church ${churchId}:`, error);
  }
}

// Worker functions that will be called by the queue
export async function processWeeklyFollowupReminders(job) {
  const { church_id } = job.data;
  await reminderService.generateFollowupReminders(church_id);
}

export async function processCrisisAlerts(job) {
  const { church_id } = job.data;
  await reminderService.generateCrisisAlerts(church_id);
}

export async function processReportReminders(job) {
  const { church_id } = job.data;
  await reminderService.generateReportReminders(church_id);
}

export async function processFoundationSchoolReminders(job) {
  const { church_id } = job.data;
  await reminderService.generateFoundationSchoolReminders(church_id);
}

export async function processAbsenteeFollowupReminders(job) {
  const { church_id } = job.data;
  await reminderService.generateAbsenteeFollowupReminders(church_id);
}