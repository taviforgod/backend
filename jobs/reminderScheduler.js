import cron from "node-cron";
import { notificationQueue } from "../workers/notificationWorker.js";
import db from "../config/db.js";
import handlebars from "handlebars";
import fs from "fs";
import path from "path";

// Helper to load and compile a handlebars template
function loadTemplate(filename) {
  const filePath = path.resolve(__dirname, "../templates/", filename);
  const source = fs.readFileSync(filePath, "utf8");
  return handlebars.compile(source);
}

const meetingTemplate = loadTemplate("churchMeeting.hbs");
const prayerTemplate = loadTemplate("prayerReminder.hbs");
const rhapsodyTemplate = loadTemplate("rhapsodyReminder.hbs");

// Church meeting reminders: Every Sunday at 8am
cron.schedule("0 8 * * 0", async () => {
  try {
    const today = new Date().toISOString().substring(0, 10);
    const meetingsRes = await db.query(
      "SELECT * FROM meetings WHERE meeting_date = $1",
      [today]
    );
    for (const meeting of meetingsRes.rows) {
      const usersRes = await db.query("SELECT * FROM users WHERE church_id = $1", [meeting.church_id]);
      for (const user of usersRes.rows) {
        const message = meetingTemplate({
          user,
          meetingDate: meeting.meeting_date,
          meetingTime: meeting.meeting_time,
          location: meeting.location,
          topic: meeting.topic
        });
        await notificationQueue.add("meeting-reminder", {
          church_id: meeting.church_id,
          target_user_id: user.id,
          channel: "email",
          title: "Church Meeting Reminder",
          message,
          recipient_email: user.email,
          metadata: { type: "meeting", meeting_id: meeting.id }
        }, { attempts: 2 });
      }
    }
    console.log(`[reminderScheduler] Church meeting reminders sent for ${today}`);
  } catch (err) {
    console.error("[reminderScheduler] Church meeting error:", err);
  }
});

// Prayer reminders: Every day at 5:30am
cron.schedule("30 5 * * *", async () => {
  try {
    const today = new Date().toISOString().substring(0, 10);
    const prayersRes = await db.query(
      "SELECT * FROM prayers WHERE scheduled_date = $1",
      [today]
    );
    for (const prayer of prayersRes.rows) {
      const userRes = await db.query("SELECT * FROM users WHERE id = $1", [prayer.user_id]);
      if (userRes.rows.length) {
        const user = userRes.rows[0];
        const message = prayerTemplate({
          user,
          prayerSubject: prayer.subject
        });
        await notificationQueue.add("prayer-reminder", {
          church_id: user.church_id,
          target_user_id: user.id,
          channel: "in_app",
          title: "Prayer Reminder",
          message,
          metadata: { type: "prayer", prayer_id: prayer.id }
        }, { attempts: 1 });
      }
    }
    console.log(`[reminderScheduler] Prayer reminders sent for ${today}`);
  } catch (err) {
    console.error("[reminderScheduler] Prayer reminder error:", err);
  }
});

// Rhapsody devotional reminders: Every day at 6:30am
cron.schedule("30 6 * * *", async () => {
  try {
    const today = new Date().toISOString().substring(0, 10);
    const usersRes = await db.query("SELECT * FROM users");
    const rhapsodyRes = await db.query("SELECT * FROM rhapsody_daily WHERE date = $1", [today]);
    const rhapsody = rhapsodyRes.rows[0] || {};
    for (const user of usersRes.rows) {
      const message = rhapsodyTemplate({
        user,
        devotionalTheme: rhapsody.theme || "Today's Devotional",
        keyVerse: rhapsody.verse || "Key verse"
      });
      await notificationQueue.add("rhapsody-reminder", {
        church_id: user.church_id,
        target_user_id: user.id,
        channel: "in_app",
        title: "Rhapsody Devotional Reminder",
        message,
        metadata: { type: "devotional", rhapsody_id: rhapsody.id }
      }, { attempts: 1 });
    }
    console.log(`[reminderScheduler] Rhapsody reminders sent for ${today}`);
  } catch (err) {
    console.error("[reminderScheduler] Rhapsody reminder error:", err);
  }
});

console.log("[reminderScheduler] Scheduler running: church meeting, prayer, rhapsody reminders active.");