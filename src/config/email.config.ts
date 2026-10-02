import { registerAs } from '@nestjs/config';

export const emailConfig = registerAs('email', () => ({
  apiKey: process.env.RESEND_API_KEY || '',
  from: process.env.EMAIL_FROM || 'Regidoo Platform <noreply@regidoo.com>',
  frontendUrl: process.env.FRONTEND_URL || process.env.APP_BASE_URL || 'http://localhost:3000',
}));
