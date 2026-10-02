import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtAccessPayload } from '../../modules/auth/token.service';

export const CurrentUser = createParamDecorator(
  (data: keyof JwtAccessPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtAccessPayload;

    return data ? user?.[data] : user;
  },
);
