export interface BaseEmailTemplateOptions {
  title: string;
  preheader?: string;
  contentHtml: string;
}

/**
 * Base email layout wrapper with Regidoo dark-slate & indigo branding
 */
export function renderBaseLayout(options: BaseEmailTemplateOptions): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #0f172a;
      color: #334155;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    }
    .header {
      background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%);
      padding: 36px 40px;
      text-align: center;
    }
    .logo-text {
      color: #ffffff;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .logo-badge {
      display: inline-block;
      margin-top: 6px;
      padding: 4px 12px;
      background: rgba(99, 102, 241, 0.2);
      border: 1px solid rgba(129, 140, 248, 0.3);
      border-radius: 9999px;
      color: #a5b4fc;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .content {
      padding: 40px;
      line-height: 1.6;
      font-size: 15px;
      color: #334155;
    }
    .h1 {
      color: #0f172a;
      font-size: 22px;
      font-weight: 700;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .button-container {
      margin: 32px 0;
      text-align: center;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #312e81 0%, #0f172a 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 10px;
      font-weight: 600;
      font-size: 15px;
      box-shadow: 0 4px 12px rgba(49, 46, 129, 0.3);
    }
    .link-fallback {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      margin-top: 20px;
      font-size: 12px;
      word-break: break-all;
      color: #64748b;
    }
    .footer {
      background-color: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 24px 40px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
    }
    .footer p {
      margin: 4px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo-text">REGIDOO</h1>
      <span class="logo-badge">Foundation Platform</span>
    </div>
    <div class="content">
      ${options.contentHtml}
    </div>
    <div class="footer">
      <p>This is an automated system notification from Regidoo Platform.</p>
      <p>If you did not request or expect this email, you can safely ignore it.</p>
      <p>&copy; ${new Date().getFullYear()} Regidoo AB. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Super Admin Account Activation & Setup Email Template
 */
export function buildSetupEmailHtml(params: {
  username: string;
  setupUrl: string;
  expiresInHours?: number;
}): string {
  const content = `
    <h2 class="h1">Welcome, ${params.username}!</h2>
    <p>Your platform administration account has been provisioned on the <strong>Regidoo Foundation Platform</strong>.</p>
    <p>To activate your account and configure your initial secure password, click the setup button below:</p>
    
    <div class="button-container">
      <a href="${params.setupUrl}" class="btn">Configure Password & Activate</a>
    </div>

    <p style="font-size: 13px; color: #64748b;">
      ⚠️ For security reasons, this activation link will expire in <strong>${params.expiresInHours || 24} hours</strong> and can only be used once.
    </p>

    <div class="link-fallback">
      If the button above does not work, copy and paste this link into your browser:<br>
      <a href="${params.setupUrl}" style="color: #4f46e5;">${params.setupUrl}</a>
    </div>
  `;

  return renderBaseLayout({
    title: 'Activate Your Regidoo Account',
    contentHtml: content,
  });
}

/**
 * Family Member Invitation Email Template
 */
export function buildFamilyInviteEmailHtml(params: {
  familyName: string;
  inviterName?: string;
  inviteUrl: string;
}): string {
  const content = `
    <h2 class="h1">You're Invited to Join a Family Vault!</h2>
    <p><strong>${params.inviterName || 'A family administrator'}</strong> has invited you to join the <strong>${params.familyName}</strong> family space on Regidoo.</p>
    <p>By joining, you will have shared access to family subscriptions, digital vault records, and security features.</p>
    
    <div class="button-container">
      <a href="${params.inviteUrl}" class="btn">Accept Family Invitation</a>
    </div>

    <p style="font-size: 13px; color: #64748b;">
      This invitation link will remain active for <strong>7 days</strong>.
    </p>

    <div class="link-fallback">
      Button not working? Use this link:<br>
      <a href="${params.inviteUrl}" style="color: #4f46e5;">${params.inviteUrl}</a>
    </div>
  `;

  return renderBaseLayout({
    title: `Invitation to join ${params.familyName} on Regidoo`,
    contentHtml: content,
  });
}

/**
 * Company Employee Invitation Email Template
 */
export function buildCompanyInviteEmailHtml(params: {
  companyName: string;
  inviterName?: string;
  inviteUrl: string;
}): string {
  const content = `
    <h2 class="h1">Team Invitation from ${params.companyName}</h2>
    <p><strong>${params.inviterName || 'A company administrator'}</strong> has added you to the corporate organization <strong>${params.companyName}</strong> on the Regidoo Platform.</p>
    <p>Click below to activate your corporate profile and join your team workspace:</p>
    
    <div class="button-container">
      <a href="${params.inviteUrl}" class="btn">Join Company Workspace</a>
    </div>

    <p style="font-size: 13px; color: #64748b;">
      This corporate invitation is valid for <strong>7 days</strong>.
    </p>

    <div class="link-fallback">
      Direct Link:<br>
      <a href="${params.inviteUrl}" style="color: #4f46e5;">${params.inviteUrl}</a>
    </div>
  `;

  return renderBaseLayout({
    title: `Join ${params.companyName} on Regidoo`,
    contentHtml: content,
  });
}

/**
 * Password Reset Email Template
 */
export function buildPasswordResetEmailHtml(params: {
  username: string;
  resetUrl: string;
}): string {
  const content = `
    <h2 class="h1">Password Reset Request</h2>
    <p>Hello ${params.username},</p>
    <p>We received a request to reset the password for your Regidoo account. Click the button below to choose a new password:</p>
    
    <div class="button-container">
      <a href="${params.resetUrl}" class="btn">Reset My Password</a>
    </div>

    <p style="font-size: 13px; color: #64748b;">
      If you did not request a password reset, please disregard this email. Your password will remain unchanged.
    </p>

    <div class="link-fallback">
      Reset Link:<br>
      <a href="${params.resetUrl}" style="color: #4f46e5;">${params.resetUrl}</a>
    </div>
  `;

  return renderBaseLayout({
    title: 'Reset Your Regidoo Password',
    contentHtml: content,
  });
}
