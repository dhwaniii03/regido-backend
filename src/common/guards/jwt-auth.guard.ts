import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { TokenService } from '../../modules/auth/token.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // 1. Extract Bearer token from Authorization header or HttpOnly cookie
    const authHeader = request.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (request.cookies?.accessToken) {
      token = request.cookies.accessToken;
    }

    if (!token) {
      throw new UnauthorizedException('Authentication token is required');
    }

    try {
      // 2. Verify token and decode user payload
      const decoded = await this.tokenService.verifyAccessToken(token);

      // Block temporary password tokens from accessing standard protected endpoints
      if (decoded.scope === 'PASSWORD_CHANGE_REQUIRED') {
        throw new UnauthorizedException(
          'Temporary password change required before accessing this endpoint',
        );
      }

      // Attach authenticated user identity to request object
      request.user = decoded;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired authentication session');
    }
  }
}
