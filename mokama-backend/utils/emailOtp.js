const https = require('https');

// Brevo HTTP API — port 443, never blocked on any platform
const brevoSend = (to, subject, html) => {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      sender:      {
        name:  'MoKama',
        email: process.env.EMAIL_USER   // your verified sender email
      },
      to:          [{ email: to }],
      subject,
      htmlContent: html,
    });

    const req = https.request({
      hostname: 'api.brevo.com',
      path:     '/v3/smtp/email',
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'api-key':        process.env.BREVO_API_KEY,
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true });
        } else {
          console.error('Brevo API error:', res.statusCode, data);
          reject(new Error(`Brevo API ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
};

// ── Generate 6-digit OTP ──
const generateEmailOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ── Send OTP email ──
const sendEmailOTP = async (email, otp, name = 'User') => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📧 [DEV] OTP for ${email}: ${otp}`);
    return { success: true, devOtp: otp };
  }
  try {
    await brevoSend(
      email,
      'MoKama — Verify Your Email',
      `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;
                  background:#0a0a0a;color:#f0f0f0;padding:32px;border-radius:16px;">
        <h2 style="color:#ff2400;text-align:center;margin:0;">MoKama</h2>
        <p style="color:#6b6b6b;text-align:center;font-size:13px;margin-top:4px;">
          Where Work Meets Trust
        </p>
        <p style="color:#a3a3a3;margin-top:24px;">Hi ${name},</p>
        <p style="color:#a3a3a3;">Your email verification OTP is:</p>
        <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;
                    text-align:center;padding:24px;margin:24px 0;">
          <span style="font-size:36px;font-weight:bold;color:#ff2400;
                       letter-spacing:12px;">${otp}</span>
        </div>
        <p style="color:#6b6b6b;font-size:13px;">⏱ Valid for 5 minutes.</p>
        <p style="color:#6b6b6b;font-size:13px;">
          🔒 Do not share this OTP with anyone.
        </p>
        <hr style="border:none;border-top:1px solid #2a2a2a;margin:24px 0;"/>
        <p style="color:#3a3a3a;font-size:12px;text-align:center;">
          © 2025 MoKama — Kaam ko Mukam tak
        </p>
      </div>
      `
    );
    return { success: true };
  } catch (err) {
    console.error('Email OTP send error:', err.message);
    return { success: false, message: 'Failed to send email OTP.' };
  }
};

// ── Generic email sender — approvals, rejections, job notifications ──
const sendEmail = async (to, subject, html) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📧 [DEV] Email to ${to}: ${subject}`);
    return { success: true };
  }
  try {
    await brevoSend(to, subject, html);
    return { success: true };
  } catch (err) {
    console.error(`Email send failed to ${to}:`, err.message);
    return { success: false, message: err.message };
  }
};

module.exports = { generateEmailOTP, sendEmailOTP, sendEmail };
