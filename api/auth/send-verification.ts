import { Resend } from 'resend';
import nodemailer from 'nodemailer';

export default async function handler(req: any, res: any) {
  // CORS Headers for API invocations
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  // Parse body safely
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const { email, fullName, verificationCode, verificationLink } = body;

  if (!email || !verificationCode) {
    return res.status(400).json({ success: false, error: 'Missing required parameters: email, verificationCode' });
  }

  // Dynamically derive app URL & host so links adapt to Vercel production, preview branches, and localhost
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers['host'] || 'dura-loop.vercel.app';
  const fallbackAppUrl = `${protocol}://${host}`;
  const appUrl = (process.env.VITE_APP_URL || process.env.APP_URL || fallbackAppUrl).replace(/\/$/, '');
  const cleanHost = host.replace(/:\d+$/, '');

  const htmlContent = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dura-Loop Passport Identity Verification</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0C1310; color: #F7F5EE; margin: 0; padding: 32px 16px; }
      .container { max-width: 520px; margin: 0 auto; background-color: #15201A; border: 1px solid #283B30; padding: 36px; border-radius: 4px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
      .brand { font-family: monospace; font-size: 13px; font-weight: bold; letter-spacing: 2px; color: #D8FF3E; text-transform: uppercase; margin-bottom: 24px; }
      h1 { font-size: 22px; color: #F7F5EE; margin: 0 0 16px 0; letter-spacing: -0.5px; }
      p { font-size: 14px; line-height: 1.6; color: #CAD7C8; margin: 0 0 16px 0; }
      .code-container { background-color: #0A0F0D; border: 2px dashed #D8FF3E; padding: 24px; text-align: center; margin: 24px 0; border-radius: 4px; }
      .code-label { font-size: 10px; font-family: monospace; color: #98A999; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; }
      .code { font-family: monospace; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #D8FF3E; }
      .button-wrapper { text-align: center; margin: 24px 0; }
      .btn { display: inline-block; background-color: #D8FF3E; color: #0F2820; font-family: monospace; font-weight: bold; font-size: 12px; text-decoration: none; padding: 14px 28px; border-radius: 2px; text-transform: uppercase; letter-spacing: 1.5px; }
      .note { font-size: 12px; color: #798E7B; line-height: 1.5; margin-top: 24px; border-top: 1px solid #283B30; padding-top: 16px; }
      .footer { font-size: 10px; font-family: monospace; color: #566858; margin-top: 24px; text-transform: uppercase; letter-spacing: 1px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="brand">DURA-LOOP // 01 SPECIMEN NETWORK</div>
      <h1>Authenticate Research Passport</h1>
      <p>Hello ${fullName ? fullName : 'Researcher'},</p>
      <p>Your institutional research account on <strong style="color: #F7F5EE;">Dura-Loop</strong> (<a href="${appUrl}" style="color: #D8FF3E; text-decoration: none;">${cleanHost}</a>) is ready for activation.</p>
      <p>Please enter your single-use verification code in the portal to confirm your custody qualifications:</p>
      
      <div class="code-container">
        <div class="code-label">VERIFICATION ACCESS CODE</div>
        <div class="code">${verificationCode}</div>
      </div>

      ${verificationLink ? `
      <div class="button-wrapper">
        <a href="${verificationLink}" class="btn" target="_blank" rel="noopener noreferrer">Confirm & Activate Passport &rarr;</a>
      </div>
      ` : ''}

      <p class="note">
        This verification pass is cryptographically bound to <strong>${email}</strong> and expires in 15 minutes. If you did not register on Dura-Loop at ${cleanHost}, you can safely ignore this automated message.
      </p>

      <div class="footer">
        HOSTED AT: ${cleanHost} • SECURED ACCESS CONTROL<br/>
        LABORATORY HARDWARE ORCHESTRATION & COMPLIANCE LEDGER
      </div>
    </div>
  </body>
  </html>
  `;

  // ─────────────────────────────────────────────────────────────
  // 1. ENGINE A: Gmail SMTP / Universal SMTP
  // Can send real OTP emails to ANY email address in the world with ZERO domain setup!
  // ─────────────────────────────────────────────────────────────
  const gmailUser = (process.env.GMAIL_USER || process.env.SMTP_USER || '').trim();
  const gmailPass = (process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || '').replace(/\s+/g, '');
  let smtpError: string | null = null;

  if (gmailUser && gmailPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // SSL
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
      });

      const info = await transporter.sendMail({
        from: `Dura-Loop Security <${gmailUser}>`,
        to: email,
        subject: `[Dura-Loop] Verify your account (${verificationCode})`,
        html: htmlContent,
      });

      console.log('Successfully delivered via Gmail SMTP to:', email, 'MessageId:', info.messageId);
      return res.status(200).json({
        success: true,
        provider: 'gmail_smtp',
        messageId: info.messageId,
        email,
      });
    } catch (err: any) {
      console.error('Gmail SMTP dispatch error:', err);
      smtpError = err?.message || 'SMTP dispatch error';
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 2. ENGINE B: Resend Service
  // Delivers to account owner in test mode, or to all users if domain is verified
  // ─────────────────────────────────────────────────────────────
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (apiKey) {
    try {
      const resend = new Resend(apiKey);
      const fromAddress = process.env.RESEND_FROM_EMAIL || 'Dura-Loop Security <onboarding@resend.dev>';

      const sendResponse = await resend.emails.send({
        from: fromAddress,
        to: [email],
        subject: `[Dura-Loop] Verify your account (${verificationCode})`,
        html: htmlContent,
      });

      if (sendResponse.error) {
        console.warn('Resend delivery restriction/error:', sendResponse.error);
        return res.status(200).json({
          success: false,
          isSimulated: true,
          message: sendResponse.error.message,
          error: `Resend Notice: ${sendResponse.error.message}`,
          diagnostics: {
            hasGmailUser: Boolean(gmailUser),
            hasGmailPass: Boolean(gmailPass),
            hasResendKey: Boolean(apiKey),
            smtpError,
          },
        });
      }

      return res.status(200).json({
        success: true,
        provider: 'resend',
        messageId: sendResponse.data?.id,
        email,
      });
    } catch (err: any) {
      console.error('API send-verification uncaught Resend error:', err);
      return res.status(200).json({
        success: false,
        isSimulated: true,
        message: err.message || 'Resend service connection error',
        error: `Resend Notice: ${err.message}`,
        diagnostics: {
          hasGmailUser: Boolean(gmailUser),
          hasGmailPass: Boolean(gmailPass),
          hasResendKey: Boolean(apiKey),
          smtpError,
        },
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 3. Fallback when neither service credentials are provided
  // ─────────────────────────────────────────────────────────────
  return res.status(200).json({
    success: false,
    isSimulated: true,
    message: 'Configure GMAIL_USER & GMAIL_APP_PASSWORD in Vercel to send real emails to any user.',
    diagnostics: {
      hasGmailUser: Boolean(gmailUser),
      hasGmailPass: Boolean(gmailPass),
      hasResendKey: Boolean(apiKey),
      smtpError,
    },
  });
}
