/**
 * Build the base SQL for fetching tasks with host (user or organization) and joinedUsers
 * Optionally append a WHERE clause
 * @param whereClause SQL fragment for WHERE (e.g., "WHERE t.title ILIKE '%foo%'")
 * @returns SQL string ready for $queryRaw
 */
export const buildTasksBaseQuery = (whereClause = ''): string => {
  return `
    SELECT
      t.id,
      t.title,
      t.description,
      t.picture,
      t."startDate",
      t."startTime",
      t."endDate",
      t.location,
      t.status,
      t.categories,
      json_build_object(
        'user', CASE WHEN u.id IS NOT NULL THEN json_build_object(
          'id', u.id,
          'name', u.name,
          'email', u.email,
          'createdAt', u."createdAt",
          'updatedAt', u."updatedAt"
        ) ELSE NULL END,
        'organization', CASE WHEN o.id IS NOT NULL THEN json_build_object(
          'id', o.id,
          'name', o.name,
          'createdAt', o."createdAt"
        ) ELSE NULL END
      ) AS host,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'id', ju.id,
            'name', ju.name
          )
        ) FILTER (WHERE ju.id IS NOT NULL), '[]'
      ) AS "joinedUsers"
    FROM "Task" t
    LEFT JOIN "Host" h ON t."hostId" = h.id
    LEFT JOIN "User" u ON h."userId" = u.id
    LEFT JOIN "Organization" o ON h."organizationId" = o.id
    LEFT JOIN "User" ju ON ju.id IN (
      SELECT "userId" FROM "JoinedUsers" j WHERE j."taskId" = t.id
    )
    ${whereClause}
    GROUP BY t.id, u.id, o.id;
  `;
};
