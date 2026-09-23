import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { TaskGeoSearchParams } from 'src/task/interfaces/task';

const METERS_IN_KILOMETER = 1000;

@Injectable()
export class TaskGeoSearchService {
  constructor(private readonly prisma: PrismaService) {}

  // NOTE: the only raw SQL of the module — Prisma cannot express ST_DWithin, which is what the
  // TaskLocation GiST index on "geo" answers. The ids feed an ordinary Prisma query afterwards.
  async findTaskIdsWithinRadius(
    params: TaskGeoSearchParams,
  ): Promise<string[]> {
    const { latitude, longitude, radiusKm } = params;
    const rows = await this.prisma.$queryRaw<{ taskId: string }[]>`
      SELECT tl."taskId"
      FROM "TaskLocation" tl
      WHERE ST_DWithin(
        tl.geo,
        ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
        ${radiusKm * METERS_IN_KILOMETER}
      )
    `;

    return rows.map((row) => row.taskId);
  }
}
