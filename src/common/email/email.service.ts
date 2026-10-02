import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  buildSetupEmailHtml,
  buildFamilyInviteEmailHtml,
  buildCompanyInviteEmailHtml,
  buildPasswordResetEmailHtml,
} from './email.templates';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export interface EmailDispatchResult {
  success: boolean;
  messageId?: string;
  isMock?: boolean;
  error?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resendClient: Resend | null = null;
  private readonly fromAddress: string;
  private readonly frontendUrl: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey =
      this.configService.get<string>('email.apiKey') ||
      this.configService.get<string>('RESEND_API_KEY') ||
      '';

    this.fromAddress =
      this.configService.get<string>('email.from') ||
      this.configService.get<string>('EMAIL_FROM') ||
      'Regidoo Platform <noreply@regidoo.com>';

    this.frontendUrl =
      this.configService.get<string>('email.frontendUrl') ||
      this.configService.get<string>('FRONTEND_URL') ||
      this.configService.get<string>('APP_BASE_URL') ||
      'http://localhost:3000';

    if (apiKey && apiKey.trim() !== '') {
      this.resendClient = new Resend(apiKey);
      this.logger.log('📧 Resend Email Client initialized with API key.');
    } else {
      this.logger.warn(
        '⚠️ RESEND_API_KEY is not configured. EmailService is operating in Mock/Development mode (emails will be logged to console).',
      );
    }
  }

  /**
   * Generic method to dispatch an email via Resend (with dev fallback)
   */
  async sendEmail(options: SendEmailOptions): Promise<EmailDispatchResult> {
    const from = options.from || this.fromAddress;
    const recipients = Array.isArray(options.to) ? options.to : [options.to];

    if (!this.resendClient) {
      this.logger.log(`\n================= 📨 [MOCK EMAIL DISPATCH] =================`);
      this.logger.log(`From:    ${from}`);
      this.logger.log(`To:      ${recipients.join(', ')}`);
      this.logger.log(`Subject: ${options.subject}`);
      this.logger.log(`============================================================\n`);

      return {
        success: true,
        messageId: `mock-msg-${Date.now()}`,
        isMock: true,
      };
    }

    try {
      const response = await this.resendClient.emails.send({
        from,
        to: recipients,
        subject: options.subject,
        html: options.html,
      });

      if (response.error) {
        this.logger.error(`❌ Resend email dispatch failed: ${response.error.message}`, response.error);
        return {
          success: false,
          error: response.error.message,
        };
      }

      this.logger.log(`✅ Email sent successfully to ${recipients.join(', ')} (ID: ${response.data?.id})`);
      return {
        success: true,
        messageId: response.data?.id,
        isMock: false,
      };
    } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error during email dispatch';
      this.logger.error(`❌ Email dispatch error: ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Dispatches initial Super Admin / Account Setup email
   * Requirement: Branded email template with link: https://<domain>/auth/setup?token=<raw_token>
   */
  async sendSetupEmail(params: {
    to: string;
    username: string;
    token: string;
    expiresInHours?: number;
  }): Promise<EmailDispatchResult> {
    const setupUrl = `${this.frontendUrl}/auth/setup?token=${encodeURIComponent(params.token)}`;
    const html = buildSetupEmailHtml({
      username: params.username,
      setupUrl,
      expiresInHours: params.expiresInHours || 24,
    });

    return this.sendEmail({
      to: params.to,
      subject: 'Activate Your Regidoo Platform Account',
      html,
    });
  }

  /**
   * Dispatches Family Member Invitation email
   * URL format: https://<domain>/invitations/family?token=<token>
   */
  async sendFamilyInviteEmail(params: {
    to: string;
    familyName: string;
    inviterName?: string;
    token: string;
  }): Promise<EmailDispatchResult> {
    const inviteUrl = `${this.frontendUrl}/invitations/family?token=${encodeURIComponent(params.token)}`;
    const html = buildFamilyInviteEmailHtml({
      familyName: params.familyName,
      inviterName: params.inviterName,
      inviteUrl,
    });

    return this.sendEmail({
      to: params.to,
      subject: `You've been invited to join the ${params.familyName} family on Regidoo`,
      html,
    });
  }

  /**
   * Dispatches Company Employee Invitation email
   * URL format: https://<domain>/invitations/company?token=<token>
   */
  async sendCompanyInviteEmail(params: {
    to: string;
    companyName: string;
    inviterName?: string;
    token: string;
  }): Promise<EmailDispatchResult> {
    const inviteUrl = `${this.frontendUrl}/invitations/company?token=${encodeURIComponent(params.token)}`;
    const html = buildCompanyInviteEmailHtml({
      companyName: params.companyName,
      inviterName: params.inviterName,
      inviteUrl,
    });

    return this.sendEmail({
      to: params.to,
      subject: `Invitation to join ${params.companyName} on Regidoo`,
      html,
    });
  }

  /**
   * Dispatches Password Reset email
   * URL format: https://<domain>/forgot-password/reset?token=<token>
   */
  async sendPasswordResetEmail(params: {
    to: string;
    username: string;
    token: string;
  }): Promise<EmailDispatchResult> {
    const resetUrl = `${this.frontendUrl}/forgot-password/reset?token=${encodeURIComponent(params.token)}`;
    const html = buildPasswordResetEmailHtml({
      username: params.username,
      resetUrl,
    });

    return this.sendEmail({
      to: params.to,
      subject: 'Reset Your Regidoo Password',
      html,
    });
  }
}
