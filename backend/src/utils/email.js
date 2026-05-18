// Simple email utility — logs to console in dev, sends via SMTP in prod
const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter;

if (process.env.NODE_ENV === 'production') {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
} else {
  // Dev: log to console instead of sending
  transporter = {
    sendMail: async (opts) => {
      console.log('\n📧 [EMAIL SIMULATION]');
      console.log('  To:', opts.to);
      console.log('  Subject:', opts.subject);
      console.log('  Body:', opts.text || opts.html);
      console.log('');
      return { messageId: 'dev-' + Date.now() };
    }
  };
}

const sendOtpEmail = async (email, otp, type = 'verify') => {
  const subjects = {
    verify: 'Kode OTP Verifikasi Akun Menara',
    reset: 'Kode OTP Reset Password Menara',
  };
  const subject = subjects[type] || subjects.verify;
  const text = `Kode OTP Anda: ${otp}\n\nKode ini berlaku selama 30 menit.\nJangan bagikan kode ini kepada siapapun.`;

  return transporter.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@menara.oikn.go.id',
    to: email,
    subject,
    text,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #eee; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #2A4E85; margin: 0;">🏢 Menara</h2>
          <p style="color: #666; font-size: 14px;">Platform Manajemen Ruangan</p>
        </div>
        <h3 style="color: #333;">Kode OTP ${type === 'reset' ? 'Reset Password' : 'Verifikasi Akun'}</h3>
        <p style="color: #666;">Gunakan kode berikut untuk ${type === 'reset' ? 'mereset password' : 'mengaktifkan akun'} Anda:</p>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #2A4E85;">${otp}</span>
        </div>
        <p style="color: #999; font-size: 13px;">Kode ini berlaku selama <strong>30 menit</strong>. Jangan bagikan kepada siapapun.</p>
      </div>
    `
  });
};

module.exports = { sendOtpEmail };
