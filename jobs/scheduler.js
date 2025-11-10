import { notificationQueue } from "../workers/notificationWorker.js";
import { Queue } from "bullmq";

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

// You would call setupRepeatableDigest for each church you want