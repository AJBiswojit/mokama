const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const generateEmailOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendEmailOTP = async (email, otp, name = 'User') => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📧 [DEV] Email OTP for ${email}: ${otp}`);
    return { success: true, devOtp: otp };
  }
  try {
    await transporter.sendMail({
      from:    process.env.EMAIL_FROM || 'MoKama <noreply@mokama.in>',
      to:      email,
      subject: 'MoKama — Verify Your Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;
                    background: #0a0a0a; color: #f0f0f0; padding: 32px; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #f97316; margin: 0;">MoKama</h2>
            <p style="color: #6b6b6b; font-size: 13px; margin: 4px 0 0 0;">Where Work Meets Trust</p>
          </div>
          <p style="color: #a3a3a3; font-size: 15px;">Hi ${name},</p>
          <p style="color: #a3a3a3; font-size: 15px;">Your email verification OTP is:</p>
          <div style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px;
                      text-align: center; padding: 24px; margin: 24px 0;">
            <span style="font-size: 36px; font-weight: bold; color: #f97316;
                         letter-spacing: 12px;">${otp}</span>
          </div>
          <p style="color: #6b6b6b; font-size: 13px;">
            ⏱ Valid for <strong style="color: #a3a3a3;">5 minutes</strong>.
          </p>
          <p style="color: #6b6b6b; font-size: 13px;">
            🔒 Do not share this OTP with anyone.
          </p>
          <hr style="border: none; border-top: 1px solid #2a2a2a; margin: 24px 0;" />
          <p style="color: #3a3a3a; font-size: 12px; text-align: center; margin: 0;">
            © 2025 MoKama — Kaam ko Mukam tak
          </p>
        </div>
      `,
    });
    return { success: true };
  } catch (err) {
    console.error('Email OTP send error:', err.message);
    return { success: false, message: 'Failed to send email OTP.' };
  }
};

const sendEmail = async (to, subject, html) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📧 [DEV] Email to ${to}: ${subject}`);
    return { success: true };
  }
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'MoKama <noreply@mokama.in>',
      to, subject, html,
    });
    return { success: true };
  } catch (err) {
    console.error(`Email send failed to ${to}:`, err.message);
    return { success: false, message: err.message };
  }
};

module.exports = { generateEmailOTP, sendEmailOTP, sendEmail };
