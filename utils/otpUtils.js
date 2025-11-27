import crypto from 'crypto';
import db from '../config/db.js';
import nodemailer from 'nodemailer';

const smtpConfig = {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined,
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
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

/**
 * sendOTP(userId, target, type = 'email'|'phone'|'reset', opts = {})
 * - target: the email or phone number (stored in 'target' column)
 * - type: verification type stored in 'type' column
 * - opts.ttlMinutes: lifetime in minutes (default 15)
 * Returns true if code persisted (and attempts delivery), false on error.
 */
export async function sendOTP(userId, target, type = 'email', opts = {}) {
  try {
    const ttlMinutes = Number(opts.ttlMinutes ?? 15);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    // numeric 6-digit for email/phone/reset by default; can override with opts.code
    const code = opts.code ? String(opts.code) : String(Math.floor(100000 + Math.random() * 900000));

    await db.query(
      `INSERT INTO user_verifications (user_id, type, code, target, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, now())`,
      [userId, String(type), code, String(target), expiresAt]
    );

    // delivery hook: integrate your email/SMS senders here
    try {
      if (type === 'email') {
        const transporter = getTransporter();
        if (transporter) {
          await transporter.sendMail({
            from: smtpConfig.from,
            to: target,
            subject: opts.subject ?? 'Verification Code',
            text: opts.text ?? `Verification Code\n\nYour verification code is:\n${code}\n\nThis code will expire in ${ttlMinutes} minutes.`,
            html: opts.html ?? `
              <div style="font-family: Arial,Helvetica,sans-serif; color:#111; padding:24px; background:#f7f9fc;">
                <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:8px; padding:24px; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
                  <h2 style="margin:0 0 12px 0; font-size:20px; color:#0b4da2;">Verification Code</h2>
                  <p style="margin:0 0 18px 0; color:#333; line-height:1.4;">
                    Your verification code is:
                  </p>
                  <p style="font-size:28px; letter-spacing:2px; margin:0 0 18px 0; font-weight:600; color:#111;">
                    ${code}
                  </p>
                  <p style="margin:0; color:#666; font-size:13px;">
                    This code will expire in ${ttlMinutes} minutes.
                  </p>
                </div>
              </div>
            `,
          });
        } else {
          // SMTP not configured: do not log the code to console
        }
      } else if (type === 'phone' && typeof globalThis.sendSMS === 'function') {
        await globalThis.sendSMS(target, `Your verification code is ${code}`);
      } else {
        // other types: no delivery performed
      }
    } catch (sendErr) {
      console.error('Failed to deliver verification (code persisted):', sendErr);
      // still return true because the code is stored and can be retrieved/resent
    }

    return true;
  } catch (err) {
    console.error('sendOTP error', err);
    return false;
  }
}

/**
 * verifyOTP(userId, code, type = 'email'|'phone'|'reset', target = undefined)
 * - Looks up latest matching non-consumed, non-expired verification row
 * - Marks consumed by setting consumed_at = now()
 * - If target is provided, it will also be matched
 * Returns true when verification succeeds, false otherwise.
 */
export async function verifyOTP(userId, code, type = 'email', target = undefined) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const params = [userId, String(type), String(code)];
    let q = `
      SELECT id, expires_at, consumed_at
      FROM user_verifications
      WHERE user_id = $1
        AND type = $2
        AND code = $3
      ORDER BY created_at DESC
      LIMIT 1
    `;

    // if target specified, match it too
    if (typeof target !== 'undefined' && target !== null) {
      q = `
        SELECT id, expires_at, consumed_at
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

    const { rows } = await client.query(q, params);
    const row = rows[0];
    if (!row) {
      await client.query('ROLLBACK');
      return false;
    }

    if (row.consumed_at) {
      await client.query('ROLLBACK');
      return false;
    }

    if (new Date(row.expires_at) < new Date()) {
      await client.query('ROLLBACK');
      return false;
    }

    // mark consumed
    await client.query(
      `UPDATE user_verifications SET consumed_at = now() WHERE id = $1`,
      [row.id]
    );

    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('verifyOTP error', err);
    return false;
  } finally {
    client.release();
  }
}