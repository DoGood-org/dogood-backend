import {
  Controller,
  HttpCode,
  HttpStatus,
  INestApplication,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { TaskCreateThrottlerV1Guard } from 'src/task/guards/task-create-throttler-v1.guard';
import { TASK_CREATE_THROTTLER_V1 } from 'src/task/interfaces/task';

@Controller('task')
class TaskCreateTestController {
  @Post()
  @UseGuards(TaskCreateThrottlerV1Guard)
  @HttpCode(HttpStatus.CREATED)
  createTask(this: void): { ok: boolean } {
    return { ok: true };
  }

  @Post('search')
  @HttpCode(HttpStatus.OK)
  searchTasks(this: void): { ok: boolean } {
    return { ok: true };
  }
}

// NOTE: each test boots a real Nest HTTP server and sends 20+ requests; under a full parallel run that outlasts 5 s.
jest.setTimeout(30_000);

describe('TaskCreateThrottlerV1Guard', () => {
  const { limit } = TASK_CREATE_THROTTLER_V1;
  let app: INestApplication | undefined;
  let baseUrl: string;

  const startApp = async (env: Record<string, string>): Promise<void> => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          ignoreEnvVars: true,
          load: [(): Record<string, string> => env],
        }),
        ThrottlerModule.forRoot([TASK_CREATE_THROTTLER_V1]),
      ],
      controllers: [TaskCreateTestController],
      providers: [TaskCreateThrottlerV1Guard],
    }).compile();

    const nestApp = moduleRef.createNestApplication({ logger: false });

    await nestApp.listen(0, '127.0.0.1');
    baseUrl = await nestApp.getUrl();
    app = nestApp;
  };

  const postTimes = async (path: string, times: number): Promise<number[]> => {
    const statuses: number[] = [];

    for (let i = 0; i < times; i += 1) {
      const response = await fetch(`${baseUrl}${path}`, { method: 'POST' });

      statuses.push(response.status);
    }

    return statuses;
  };

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('should be 20 requests per 5 minutes', () => {
    expect(TASK_CREATE_THROTTLER_V1).toEqual({
      name: 'task-create-v1',
      ttl: 5 * 60 * 1000,
      limit: 20,
    });
  });

  it('should answer 429 with the legacy body after the limit when the variable is not set', async () => {
    await startApp({});

    const statuses = await postTimes('/task', limit);
    const blocked = await fetch(`${baseUrl}/task`, { method: 'POST' });

    expect(statuses.every((status) => status === 201)).toBe(true);
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toEqual({
      message: 'Too many requests. Please try again later.',
    });
    expect(blocked.headers.get('retry-after-task-create-v1')).not.toBeNull();
  });

  it('should keep the limit when IS_TASK_RATE_LIMIT_ENABLED=true', async () => {
    await startApp({ IS_TASK_RATE_LIMIT_ENABLED: 'true' });

    const statuses = await postTimes('/task', limit + 1);

    expect(statuses.at(-1)).toBe(429);
  });

  it('should let more than 20 tasks through when IS_TASK_RATE_LIMIT_ENABLED=false', async () => {
    await startApp({ IS_TASK_RATE_LIMIT_ENABLED: 'false' });

    const statuses = await postTimes('/task', limit + 10);

    expect(statuses.every((status) => status === 201)).toBe(true);
  });

  it('should not limit a route without the guard', async () => {
    await startApp({});

    const statuses = await postTimes('/task/search', limit + 5);

    expect(statuses.every((status) => status === 200)).toBe(true);
  });
});
