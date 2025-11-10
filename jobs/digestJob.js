import { notificationQueue } from "../workers/notificationWorker.js";
import db from "../config/db.js";
import handlebars from "handlebars";
import fs from "fs";
import path from "path";

const templatePath = path.resolve(__dirname, "../templates/digest.hbs");
const digestTemplate = handlebars.compile(fs.readFileSync(templatePath, "utf8"));

export async function runDailyDigest(church_id) {
  // Load users with digest enabled
  const usersRes = await db.query(
    `SELECT u.id as user_id, u.email, p.channels
      FROM users u
      JOIN user_notification_preferences p ON p.user_id = u.id
      WHERE p.digest_enabled = TRUE AND u.church_id = $1`, [church_id]
  );

  // Aggregate today's notifications/posts/etc (example)
  const postsRes = await db.query(
    `SELECT title, content, created_at FROM message_board_posts WHERE church_id = $1 AND created_at >= NOW() - INTERVAL '1 day'`,
    [church_id]
  );
  const posts = postsRes.rows;

  for (const user of usersRes.rows) {
    // Compose digest message using template
    const html = digestTemplate({
      user,
      posts,
      date: new Date().toLocaleDateString()
    });
    await notificationQueue.add('daily-digest', {
      church_id,
      target_user_id: user.user_id,
      channel: user.channels.email ? "email" : "in_app",
      title: "Daily Digest",
      message: html,
      recipient_email: user.email
    }, { attempts: 2 });
  }
  console.log(`[digestJob] Daily digest queued for church_id ${church_id}`);
}