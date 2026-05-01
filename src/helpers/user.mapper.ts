export const mapUserOrganizations = (memberships: any[]) => {
  if (!memberships) return [];
  
  return memberships.map((m) => ({
    ...m.organization,
    role: m.role,
    status: m.status,
    joinedAt: m.createdAt,
  }));
};