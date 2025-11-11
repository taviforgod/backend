import crypto from 'crypto';
import db from '../config/db.js';
import nodemailer from 'nodemailer';
import fetch from 'node-fetch'; // For Brevo API

// -------------------------
// Email Configuration
// -------------------------
const smtpConfig = {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined,
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
  from: process.env.EMAIL_FROM || process.env.SMTP_USER,
};

// Helper to initialize nodemailer (only if SMTP available)
function getTransporter() {
  if (!smtpConfig.host || !smtpConfig.auth || !smtpConfig.from) return null;
  return nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: smtpConfig.auth,
  });
}

// -------------------------
// Brevo Email Fallback
// -------------------------
async function sendEmailViaBrevo(to, subject, html, text) {
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: {
          email: process.env.EMAIL_FROM,
          name: process.env.APP_NAME || 'Your App',
        },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error('❌ Brevo send failed:', res.status, data);
      throw new Error(data?.message || `Brevo API failed with status ${res.status}`);
    }

    if (data?.messageId) {
      console.log(`✅ Brevo delivered (messageId: ${data.messageId}) to ${to}`);
    } else {
      console.warn('⚠️ Brevo accepted but no messageId. Check Brevo logs.', data);
    }

    return data;
  } catch (err) {
    console.error('❌ Brevo send error:', err);
    throw err;
  }
}

// -------------------------
// sendOTP()
// -------------------------
export async function sendOTP(userId, target, type = 'email', opts = {}) {
  if (!userId) throw new Error('Missing userId for OTP');
  if (!target && type === 'email') throw new Error('Missing email target for OTP');

  try {
    const ttlMinutes = Number(opts.ttlMinutes ?? 15);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    const code = opts.code || String(Math.floor(100000 + Math.random() * 900000));

    // Save to DB first
    await db.query(
      `INSERT INTO user_verifications (user_id, type, code, target, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, now())`,
      [userId, String(type), code, String(target), expiresAt]
    );

    console.log(`💾 OTP saved to DB for userId=${userId}, target=${target}, code=${code}`);

    // -------------------------
    // Delivery Section
    // -------------------------
    if (type === 'email') {
      const subject = opts.subject ?? 'Verification Code';
      const text =
        opts.text ??
        `Verification Code\n\nYour verification code is: ${code}\n\nThis code will expire in ${ttlMinutes} minutes.`;
      const html =
        opts.html ??
        `
          <div style="font-family: Arial, Helvetica, sans-serif; color:#111; padding:24px; background:#f7f9fc;">
            <div style="max-width:600px; margin:0 auto; background:#fff; border-radius:8px; padding:24px; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
              <h2 style="margin:0 0 12px 0; font-size:20px; color:#0b4da2;">Verification Code</h2>
              <p>Your verification code is:</p>
              <p style="font-size:28px; letter-spacing:2px; margin:0 0 18px 0; font-weight:600; color:#111;">${code}</p>
              <p>This code will expire in ${ttlMinutes} minutes.</p>
            </div>
          </div>
        `;

      if (process.env.BREVO_API_KEY) {
        await sendEmailViaBrevo(target, subject, html, text);
      } else {
        const transporter = getTransporter();
        if (transporter) {
          await transporter.sendMail({ from: smtpConfig.from, to: target, subject, text, html });
          console.log('✅ Email sent via SMTP to:', target);
        } else {
          console.warn('⚠️ No email delivery configured (neither Brevo nor SMTP)');
        }
      }
    } else if (type === 'phone' && typeof globalThis.sendSMS === 'function') {
      await globalThis.sendSMS(target, `Your verification code is ${code}`);
    }

    return true;
  } catch (err) {
    console.error('❌ sendOTP error:', err);
    return false;
  }
}

// -------------------------
// verifyOTP()
// -------------------------
export async function verifyOTP(userId, code, type = 'email', target = undefined) {
  if (!userId) throw new Error('Missing userId for OTP verification');
  if (!code) throw new Error('Missing OTP code');

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const params = [userId, String(type), String(code)];
    let query = `
      SELECT id, expires_at, consumed_at, target
      FROM user_verifications
      WHERE user_id = $1
        AND type = $2
        AND code = $3
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (target) {
      query = `
        SELECT id, expires_at, consumed_at, target
        FROM user_verifications
        WHERE user_id = $1
          AND type = $2
          AND code = $3
          AND target = $4
        ORDER BY created_at DESC
        LIMIT 1
      `;
      params.push(String(target));
    }

    const { rows } = await client.query(query, params);
    const record = rows[0];

    if (!record) {
      console.warn(`⚠️ OTP not found for userId=${userId}, type=${type}, target=${target}`);
      await client.query('ROLLBACK');
      return false;
    }

    const now = new Date();
    if (record.consumed_at) {
      console.warn(`⚠️ OTP already consumed (id=${record.id}) for userId=${userId}`);
      await client.query('ROLLBACK');
      return false;
    }

    if (new Date(record.expires_at) < now) {
      console.warn(`⚠️ OTP expired (id=${record.id}, expiresAt=${record.expires_at}) for userId=${userId}`);
      await client.query('ROLLBACK');
      return false;
    }

    await client.query(`UPDATE user_verifications SET consumed_at = now() WHERE id = $1`, [record.id]);
    await client.query('COMMIT');

    console.log(`✅ OTP verified successfully (id=${record.id}) for userId=${userId}, target=${record.target}`);
    return true;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ verifyOTP error:', err);
    return false;
  } finally {
    client.release();
  }
}
