import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TokenService } from './token.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { CryptoModule } from '../../common/crypto/crypto.module';
import { DrizzleModule } from '../../db/drizzle.module';
import { jwtConfig } from '../../config/jwt.config';

@Module({
  imports: [
    ConfigModule.forFeature(jwtConfig),
    CryptoModule,
    DrizzleModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('jwt.secret') ||
          configService.get<string>('JWT_SECRET') ||
          'regidoo-super-secret-jwt-key-change-in-production-2026',
        signOptions: {
          expiresIn: (configService.get<string>('jwt.accessTtl') as any) || '15m',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService],
  exports: [AuthService, TokenService, JwtModule, CryptoModule],
})
export class AuthModule {}
