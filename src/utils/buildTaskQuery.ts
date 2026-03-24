import { Prisma } from '@prisma/client';

/**
 * Build the base SQL for fetching tasks with host (user or organization) and joinedUsers
 * Optionally append a WHERE clause
 * @param whereClause SQL fragment for WHERE (e.g., "WHERE t.title ILIKE '%foo%'")
 * @returns SQL string ready for $queryRaw
 */
export const buildTasksBaseQueryParts = () => {
  const selectFrom = Prisma.sql`
    SELECT
      t.id,
      t.title,
      t.description,
      t.picture,
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
      t.status,
      t.categories,
      json_build_object(
        'type', h.type,
        'user', CASE WHEN u.id IS NOT NULL THEN json_build_object(
          'id', u.id,
          'name', u.name,
          'avatar', up.avatar,
          'createdAt', u."createdAt",
          'updatedAt', u."updatedAt"
        ) ELSE NULL END,
        'organization', CASE WHEN o.id IS NOT NULL THEN json_build_object(
          'id', o.id,
          'name', o.name,
          'avatar', o.avatar,
          'createdAt', o."createdAt"
        ) ELSE NULL END
      ) AS host,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'id', ju.id,
            'name', ju.name
          )
        ) FILTER (WHERE ju.id IS NOT NULL),
        '[]'
      ) AS "joinedUsers"
    FROM "Task" t
    LEFT JOIN "Host" h ON t."hostId" = h.id
    LEFT JOIN "User" u ON h."userId" = u.id
    LEFT JOIN "UserProfile" up ON up."userId" = u.id
    LEFT JOIN "Organization" o ON h."organizationId" = o.id
    LEFT JOIN "_JoinedTasks" jt ON jt."A" = t.id
    LEFT JOIN "User" ju ON ju.id = jt."B"
  `;

  const groupBy = Prisma.sql`
    GROUP BY t.id, h.type, u.id, up.avatar, o.id
  `;

  return { selectFrom, groupBy };
};

export const buildTasksBaseQuery = (whereClause?: Prisma.Sql) => {
  const { selectFrom, groupBy } = buildTasksBaseQueryParts();

  return Prisma.sql`
    ${selectFrom}
    ${whereClause ?? Prisma.empty}
    ${groupBy}
  `;
};
