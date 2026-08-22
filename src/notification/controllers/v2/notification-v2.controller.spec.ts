import { ArgumentMetadata, PipeTransform, Type } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';
import { ZodValidationPipe } from 'nestjs-zod';
import { NotificationV2Controller } from 'src/notification/controllers/v2/notification-v2.controller';

/**
 * DEFECT-1 (регресія): `?isRead=` повертав 400 на кожному значенні, бо схема
 * валідувалась двічі — глобальним `APP_PIPE` і ще раз пайпом на рівні параметра.
 * Перший прохід робив з `"false"` буль, другий віддавав той буль у `z.stringbool()`.
 *
 * Тому тест проганяє *весь* ланцюг пайпів так, як його збирає Nest
 * (глобальний + оголошені на параметрі), а не один `schema.parse()`.
 */
type RouteArg = { index: number; pipes?: PipeTransform[] };

/** Метадані параметра `@Query()` роута: його metatype і його власні пайпи. */
function queryParam(method: string): {
  metatype: Type<unknown>;
  pipes: PipeTransform[];
} {
  const args =
    (Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      NotificationV2Controller,
      method,
    ) as Record<string, RouteArg> | undefined) ?? {};

  const entry = Object.entries(args).find(([key]) =>
    key.startsWith(`${RouteParamtypes.QUERY}:`),
  );
  if (!entry) throw new Error(`no @Query() param on ${method}`);

  const paramtypes = Reflect.getMetadata(
    'design:paramtypes',
    NotificationV2Controller.prototype,
    method,
  ) as Type<unknown>[];

  return {
    metatype: paramtypes[entry[1].index],
    pipes: entry[1].pipes ?? [],
  };
}

/** Прогін значення через глобальний APP_PIPE, а далі — через пайпи параметра. */
function runPipeChain(method: string, value: unknown): unknown {
  const { metatype, pipes } = queryParam(method);
  const metadata: ArgumentMetadata = {
    type: 'query',
    metatype,
    data: undefined,
  };

  return [new ZodValidationPipe(), ...pipes].reduce(
    (acc, pipe) => pipe.transform(acc, metadata) as unknown,
    value,
  );
}

describe('NotificationV2Controller query validation', () => {
  it('should not stack a param-level pipe on top of the global APP_PIPE', () => {
    expect(queryParam('getNotifications').pipes).toHaveLength(0);
  });

  it('should resolve the DTO metatype so the global APP_PIPE actually validates', () => {
    expect(queryParam('getNotifications').metatype?.name).toBe(
      'GetNotificationsRequestV2Dto',
    );
  });

  it('should parse isRead through the full pipe chain', () => {
    expect(runPipeChain('getNotifications', { isRead: 'false' })).toEqual({
      isRead: false,
    });
    expect(runPipeChain('getNotifications', { isRead: 'true' })).toEqual({
      isRead: true,
    });
    expect(runPipeChain('getNotifications', {})).toEqual({});
  });

  it('should reject a NUL byte in search instead of letting Postgres 500', () => {
    expect(() =>
      runPipeChain('getNotifications', { search: 'ab\u0000cd' }),
    ).toThrow();
    expect(runPipeChain('getNotifications', { search: 'ab' })).toEqual({
      search: 'ab',
    });
  });

  it('should still coerce and reject the numeric query params', () => {
    expect(
      runPipeChain('getNotifications', { skip: '40', limit: '10' }),
    ).toEqual({ skip: 40, limit: 10 });
    expect(() => runPipeChain('getNotifications', { limit: '51' })).toThrow();
    expect(() =>
      runPipeChain('getNotifications', { isRead: 'maybe' }),
    ).toThrow();
  });
});
