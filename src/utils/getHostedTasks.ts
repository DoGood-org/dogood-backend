import { prisma } from '@/lib/prisma';
import { Task } from '@prisma/client';

export const getHostedTasks = async (
  id: string,
  type: 'USER' | 'ORGANIZATION'
): Promise<Task[] | null> => {
  const hostRecord = await prisma.host.findFirst({
    where: {
      type,
      ...(type === 'USER' ? { userId: id } : { organizationId: id }),
    },
  });
  let hostedTasks: Array<any> = [];

  if (hostRecord) {
    hostedTasks = await prisma.$queryRaw<Array<any>>`
    SELECT
      t.id,
      t.title,
      t.description,
      t.picture,
      t."hostId",
      t."startDate",
      t."startTime",
      t."endDate",
      CASE
        WHEN t.location IS NOT NULL THEN json_build_object(
          'lat', ST_Y(t.location::geometry),
          'lng', ST_X(t.location::geometry)
        )
      ELSE NULL
      END AS location,     
      t."locationName",
      t.amount,
      t."currentAmount",
      t.currency,
      t.requirements,
      t.status::text,
      t.categories,
      t."createdAt",
      t."updatedAt"
    FROM "Task" t
    LEFT JOIN "Location" l ON t."locationId" = l.id
    WHERE t."hostId" = ${hostRecord.id}
  `;
  }

  return hostedTasks;
};
