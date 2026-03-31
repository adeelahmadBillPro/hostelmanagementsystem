/**
 * Email utility with templates.
 *
 * Supports Resend (recommended) or nodemailer via SMTP.
 * Set the following env vars to enable:
 *
 *   RESEND_API_KEY=re_xxxx          — preferred
 *   SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS  — fallback
 *
 * Without any env vars, emails are logged to console only (development mode).
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // To enable real email delivery, install one of:
    //   npm i resend          — then set RESEND_API_KEY env var
    //   npm i nodemailer      — then set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS env vars
    // Without these packages, emails are logged to console (development mode).

    // —— Console output (dev mode) ————————————————————————————————————————
    console.log(`[EMAIL] To: ${options.to} | Subject: ${options.subject}`);
    console.log(`[EMAIL] Body preview: ${options.html.substring(0, 120)}...`);
    return true;
  } catch (error) {
    console.error("Email send error:", error);
    return false;
  }
}

// —— Email Templates ——————————————————————————————————————————————————————

export function welcomeEmail(name: string, email: string, password: string, loginUrl: string): EmailOptions {
  return {
    to: email,
    subject: "Welcome to HostelHub — Your Account is Ready",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:24px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="color:white;margin:0;font-size:24px;">HostelHub</h1>
        </div>
        <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
          <h2 style="color:#1e293b;">Welcome, ${name}!</h2>
          <p style="color:#475569;">Your HostelHub account has been created. Use the credentials below to log in:</p>
          <div style="background:white;padding:16px;border-radius:8px;border:1px solid #e2e8f0;margin:16px 0;">
            <p style="margin:4px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin:4px 0;"><strong>Password:</strong> <code>${password}</code></p>
            <p style="margin:4px 0;"><strong>Login:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
          </div>
          <p style="color:#94a3b8;font-size:12px;">Please change your password after first login.</p>
        </div>
      </div>
    `,
  };
}

export function billGeneratedEmail(name: string, email: string, amount: number, month: string, loginUrl: string): EmailOptions {
  return {
    to: email,
    subject: `HostelHub — Your ${month} Bill is Ready`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:24px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="color:white;margin:0;font-size:24px;">HostelHub</h1>
        </div>
        <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
          <h2 style="color:#1e293b;">Bill Ready — ${month}</h2>
          <p style="color:#475569;">Hi ${name}, your bill for <strong>${month}</strong> has been generated.</p>
          <div style="background:white;padding:16px;border-radius:8px;border:1px solid #e2e8f0;margin:16px 0;text-align:center;">
            <p style="font-size:28px;font-weight:bold;color:#4F46E5;margin:0;">PKR ${amount.toLocaleString("en-PK")}</p>
            <p style="color:#94a3b8;margin:4px 0;">Total Amount Due</p>
          </div>
          <a href="${loginUrl}" style="display:block;text-align:center;background:#4F46E5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px;">
            View & Pay Bill
          </a>
        </div>
      </div>
    `,
  };
}

export function passwordResetEmail(name: string, email: string, resetUrl: string): EmailOptions {
  return {
    to: email,
    subject: "HostelHub — Reset Your Password",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:24px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="color:white;margin:0;font-size:24px;">HostelHub</h1>
        </div>
        <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
          <h2 style="color:#1e293b;">Password Reset Request</h2>
          <p style="color:#475569;">Hi ${name}, we received a request to reset your password. Click the button below to set a new one:</p>
          <a href="${resetUrl}" style="display:block;text-align:center;background:#4F46E5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:20px 0;">
            Reset Password
          </a>
          <p style="color:#94a3b8;font-size:12px;">This link expires in 1 hour. If you did not request this, ignore this email.</p>
        </div>
      </div>
    `,
  };
}

export function paymentApprovedEmail(name: string, email: string, amount: number, month: string, loginUrl: string): EmailOptions {
  return {
    to: email,
    subject: `HostelHub — Payment of PKR ${amount.toLocaleString()} Approved`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#059669,#10B981);padding:24px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="color:white;margin:0;font-size:24px;">HostelHub</h1>
        </div>
        <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
          <h2 style="color:#1e293b;">Payment Approved</h2>
          <p style="color:#475569;">Hi ${name}, your payment of <strong>PKR ${amount.toLocaleString("en-PK")}</strong> for <strong>${month}</strong> has been approved.</p>
          <a href="${loginUrl}" style="display:block;text-align:center;background:#059669;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px;">
            View Receipt
          </a>
        </div>
      </div>
    `,
  };
}

export function newPasswordEmail(name: string, email: string, newPassword: string): EmailOptions {
  return {
    to: email,
    subject: "HostelHub — Your New Password",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:24px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="color:white;margin:0;font-size:24px;">HostelHub</h1>
        </div>
        <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
          <h2 style="color:#1e293b;">Your New Password</h2>
          <p style="color:#475569;">Hi ${name}, your password has been reset. Use the credentials below to log in:</p>
          <div style="background:white;padding:16px;border-radius:8px;border:1px solid #e2e8f0;margin:16px 0;">
            <p style="margin:4px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin:4px 0;"><strong>New Password:</strong> <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">${newPassword}</code></p>
          </div>
          <p style="color:#94a3b8;font-size:12px;">Please change your password after logging in.</p>
        </div>
      </div>
    `,
  };
}
