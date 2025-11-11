import db from '../config/db.js';
import nodemailer from 'nodemailer';
import fetch from 'node-fetch';

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
// Brevo Email
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

    console.log(`✅ Brevo delivered (messageId: ${data.messageId || 'N/A'}) to ${to}`);
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
  if (!target) throw new Error('Missing target (email or phone) for OTP');
  if (!type) type = 'email';

  const ttlMinutes = Number(opts.ttlMinutes ?? 15);
  const code = opts.code || String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  console.log('📝 Preparing OTP:', { userId, target, type, code, expiresAt });

  // -------------------------
  // 1️⃣ Save to DB first
  // -------------------------
  try {
    const insertQuery = `
      INSERT INTO user_verifications (user_id, type, code, target, expires_at, created_at)
      VALUES ($1, $2, $3, $4, $5, now())
      RETURNING *
    `;
    const { rows } = await db.query(insertQuery, [userId, type, code, target, expiresAt]);
    if (!rows[0]) throw new Error('Failed to insert OTP into DB');
    console.log('✅ OTP saved to DB:', rows[0]);
  } catch (dbErr) {
    console.error('❌ Failed to save OTP to DB:', dbErr);
    throw dbErr;
  }

  // -------------------------
  // 2️⃣ Send email (if type=email)
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

    try {
      if (process.env.BREVO_API_KEY) {
        await sendEmailViaBrevo(target, subject, html, text);
      } else {
        const transporter = getTransporter();
        if (transporter) {
          await transporter.sendMail({ from: smtpConfig.from, to: target, subject, text, html });
          console.log('✅ Email sent via SMTP to:', target);
        } else {
          console.warn('⚠️ No email delivery method configured');
        }
      }
    } catch (sendErr) {
      console.error('⚠️ OTP saved but email failed:', sendErr);
      // Don't throw, code is still saved
    }
  }

  // -------------------------
  // 3️⃣ Optional: SMS
  // -------------------------
  if (type === 'phone' && typeof globalThis.sendSMS === 'function') {
    try {
      await globalThis.sendSMS(target, `Your verification code is ${code}`);
    } catch (smsErr) {
      console.error('⚠️ OTP saved but SMS failed:', smsErr);
    }
  }

  return code;
}
