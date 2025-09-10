export const parseLocation = (
  loc: string | null | undefined
): { lat: number; lng: number } | undefined => {
  if (!loc) return undefined;
  const matches = loc.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
  if (!matches) return undefined;
  return { lat: parseFloat(matches[2]), lng: parseFloat(matches[1]) };
};
