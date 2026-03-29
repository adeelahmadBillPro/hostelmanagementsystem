/**
 * Email utility with templates.
 * Currently logs to console. Replace with actual email service (SendGrid, Resend, etc.) in production.
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // TODO: Replace with actual email service
    // Example with Resend:
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({ from: 'HostelHub <noreply@hostelhub.pk>', ...options });

    console.log(`[EMAIL] To: ${options.to} | Subject: ${options.subject}`);
    console.log(`[EMAIL] Body preview: ${options.html.substring(0, 100)}...`);
    return true;
  } catch (error) {
    console.error("Email send error:", error);
    return false;
  }
}

// ── Email Templates ──

export function welcomeEmail(name: string, email: string, password: string, loginUrl: string): EmailOptions {
  return {
    to: email,
    subject: "Welcome to HostelHub - Your Account is Ready",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:24px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="color:white;margin:0;font-size:24px;">HostelHub</h1>
        </div>
        <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
          <h2 style="color:#1e293b;">Welcome, ${name}!</h2>
          <p style="color:#475569;">Your HostelHub account has been created. Use the credentials below to login:</p>
          <div style="background:white;padding:16px;border-radius:8px;border:1px solid #e2e8f0;margin:16px 0;">
            <p style="margin:4px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin:4px 0;"><strong>Password:</strong> ${password}</p>
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
    subject: `HostelHub - Your ${month} Bill is Ready`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:24px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="color:white;margin:0;font-size:24px;">HostelHub</h1>
        </div>
        <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
          <h2 style="color:#1e293b;">Hi ${name},</h2>
          <p style="color:#475569;">Your bill for <strong>${month}</strong> has been generated.</p>
          <div style="background:white;padding:16px;border-radius:8px;border:1px solid #e2e8f0;margin:16px 0;text-align:center;">
            <p style="color:#94a3b8;font-size:14px;margin:0;">Total Amount</p>
            <p style="color:#4F46E5;font-size:32px;font-weight:bold;margin:8px 0;">PKR ${amount.toLocaleString()}</p>
          </div>
          <a href="${loginUrl}" style="display:block;background:#4F46E5;color:white;text-align:center;padding:12px;border-radius:8px;text-decoration:none;font-weight:bold;">View Bill & Pay</a>
        </div>
      </div>
    `,
  };
}

export function passwordResetEmail(name: string, email: string, newPassword: string): EmailOptions {
  return {
    to: email,
    subject: "HostelHub - Password Reset",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:24px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="color:white;margin:0;font-size:24px;">HostelHub</h1>
        </div>
        <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
          <h2 style="color:#1e293b;">Hi ${name},</h2>
          <p style="color:#475569;">Your password has been reset. Your new password is:</p>
          <div style="background:white;padding:16px;border-radius:8px;border:1px solid #e2e8f0;margin:16px 0;text-align:center;">
            <p style="font-size:24px;font-weight:bold;color:#4F46E5;letter-spacing:2px;">${newPassword}</p>
          </div>
          <p style="color:#94a3b8;font-size:12px;">Please change your password after login.</p>
        </div>
      </div>
    `,
  };
}
