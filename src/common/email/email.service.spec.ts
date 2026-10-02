import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { emailConfig } from '../../config/email.config';
import {
  buildSetupEmailHtml,
  buildFamilyInviteEmailHtml,
  buildCompanyInviteEmailHtml,
  buildPasswordResetEmailHtml,
} from './email.templates';

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [emailConfig],
        }),
      ],
      providers: [EmailService],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate valid setup email with activation URL', async () => {
    const rawToken = 'super-secret-setup-token-12345';
    const result = await service.sendSetupEmail({
      to: 'admin@regidoo.com',
      username: 'Daniel Lindqvist',
      token: rawToken,
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });

  it('should generate valid family invite email', async () => {
    const rawToken = 'family-invite-token-abc';
    const result = await service.sendFamilyInviteEmail({
      to: 'anna@example.com',
      familyName: 'Lindqvist Family',
      inviterName: 'Daniel Lindqvist',
      token: rawToken,
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });

  it('should generate valid company invite email', async () => {
    const rawToken = 'company-invite-token-xyz';
    const result = await service.sendCompanyInviteEmail({
      to: 'maria@nordictech.se',
      companyName: 'Nordic Tech Solutions AB',
      inviterName: 'Johan Berg',
      token: rawToken,
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });

  it('should render HTML templates with correct CTA links and branding', () => {
    const setupHtml = buildSetupEmailHtml({
      username: 'AdminUser',
      setupUrl: 'http://localhost:3000/auth/setup?token=xyz123',
    });

    expect(setupHtml).toContain('REGIDOO');
    expect(setupHtml).toContain('AdminUser');
    expect(setupHtml).toContain('http://localhost:3000/auth/setup?token=xyz123');
    expect(setupHtml).toContain('Configure Password & Activate');

    const familyHtml = buildFamilyInviteEmailHtml({
      familyName: 'Smith Family',
      inviteUrl: 'http://localhost:3000/invitations/family?token=fam123',
    });

    expect(familyHtml).toContain('Smith Family');
    expect(familyHtml).toContain('http://localhost:3000/invitations/family?token=fam123');

    const companyHtml = buildCompanyInviteEmailHtml({
      companyName: 'Acme Corp',
      inviteUrl: 'http://localhost:3000/invitations/company?token=corp123',
    });

    expect(companyHtml).toContain('Acme Corp');
    expect(companyHtml).toContain('http://localhost:3000/invitations/company?token=corp123');

    const resetHtml = buildPasswordResetEmailHtml({
      username: 'Erik',
      resetUrl: 'http://localhost:3000/forgot-password/reset?token=res123',
    });

    expect(resetHtml).toContain('Erik');
    expect(resetHtml).toContain('http://localhost:3000/forgot-password/reset?token=res123');
  });
});
