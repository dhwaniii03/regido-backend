import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { CurrentUser } from './current-user.decorator';

describe('CurrentUser Decorator', () => {
  function getParamDecoratorFactory(decorator: any) {
    class TestClass {
      public testMethod(@decorator() _param: any) {}
    }

    const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestClass, 'testMethod');
    return args[Object.keys(args)[0]].factory;
  }

  function createMockExecutionContext(user: any): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should extract specific property if data key is passed', () => {
    const factory = getParamDecoratorFactory(CurrentUser);
    const mockUser = { sub: 42, email: 'admin@regidoo.com', systemRole: 'system_admin' };
    const ctx = createMockExecutionContext(mockUser);

    const result = factory('sub', ctx);
    expect(result).toBe(42);

    const emailResult = factory('email', ctx);
    expect(emailResult).toBe('admin@regidoo.com');
  });

  it('should return entire user object if no data key is provided', () => {
    const factory = getParamDecoratorFactory(CurrentUser);
    const mockUser = { sub: 42, email: 'admin@regidoo.com', systemRole: 'system_admin' };
    const ctx = createMockExecutionContext(mockUser);

    const result = factory(undefined, ctx);
    expect(result).toEqual(mockUser);
  });

  it('should return undefined if user is not attached to request', () => {
    const factory = getParamDecoratorFactory(CurrentUser);
    const ctx = createMockExecutionContext(undefined);

    const result = factory('sub', ctx);
    expect(result).toBeUndefined();
  });
});
