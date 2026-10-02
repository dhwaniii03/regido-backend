import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { LoginDto } from './login.dto';
import { ChangePasswordDto } from './change-password.dto';

describe('Auth DTO Validation Suite', () => {
  describe('LoginDto', () => {
    it('should pass validation with valid email and password', async () => {
      const dto = plainToInstance(LoginDto, {
        email: 'admin@regidoo.com',
        password: 'SecurePassword@2026!',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.email).toBe('admin@regidoo.com');
    });

    it('should trim and lowercase email during transformation', async () => {
      const dto = plainToInstance(LoginDto, {
        email: '  ADMIN@REGIDOO.COM  ',
        password: 'Password123!',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.email).toBe('admin@regidoo.com');
    });

    it('should fail validation when email is invalid format', async () => {
      const dto = plainToInstance(LoginDto, {
        email: 'invalid-email-format',
        password: 'Password123!',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isEmail).toBeDefined();
    });

    it('should fail validation when email is empty', async () => {
      const dto = plainToInstance(LoginDto, {
        email: '',
        password: 'Password123!',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation when password is empty', async () => {
      const dto = plainToInstance(LoginDto, {
        email: 'admin@regidoo.com',
        password: '',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isNotEmpty).toBeDefined();
    });

    it('should fail validation when fields are missing', async () => {
      const dto = plainToInstance(LoginDto, {});

      const errors = await validate(dto);
      expect(errors.length).toBe(2);
    });
  });

  describe('ChangePasswordDto', () => {
    it('should pass validation with valid current and strong new password', async () => {
      const dto = plainToInstance(ChangePasswordDto, {
        currentPassword: 'TempAdmin@2026!',
        newPassword: 'MyNewStrongPassword@2026!',
        tempToken: 'valid-temp-token',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass validation when optional tempToken is omitted', async () => {
      const dto = plainToInstance(ChangePasswordDto, {
        currentPassword: 'TempAdmin@2026!',
        newPassword: 'MyNewStrongPassword@2026!',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation when current password is empty', async () => {
      const dto = plainToInstance(ChangePasswordDto, {
        currentPassword: '',
        newPassword: 'MyNewStrongPassword@2026!',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isNotEmpty).toBeDefined();
    });

    it('should fail validation when new password is shorter than 8 characters', async () => {
      const dto = plainToInstance(ChangePasswordDto, {
        currentPassword: 'TempAdmin@2026!',
        newPassword: 'Sh1@', // only 4 chars
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.minLength).toBeDefined();
    });

    it('should fail validation when new password lacks uppercase letter', async () => {
      const dto = plainToInstance(ChangePasswordDto, {
        currentPassword: 'TempAdmin@2026!',
        newPassword: 'lowercaseonly1@!',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.matches).toBeDefined();
    });

    it('should fail validation when new password lacks lowercase letter', async () => {
      const dto = plainToInstance(ChangePasswordDto, {
        currentPassword: 'TempAdmin@2026!',
        newPassword: 'UPPERCASEONLY1@!',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.matches).toBeDefined();
    });

    it('should fail validation when new password lacks numbers', async () => {
      const dto = plainToInstance(ChangePasswordDto, {
        currentPassword: 'TempAdmin@2026!',
        newPassword: 'NoNumbersInPassword@!',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.matches).toBeDefined();
    });

    it('should fail validation when new password lacks special symbols', async () => {
      const dto = plainToInstance(ChangePasswordDto, {
        currentPassword: 'TempAdmin@2026!',
        newPassword: 'NoSpecialSymbols12345',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.matches).toBeDefined();
    });
  });
});
