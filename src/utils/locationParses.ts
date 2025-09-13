export const parseLocation = (locationStr: string | null | undefined) => {
  if (!locationStr) return undefined;

  const match = locationStr.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
  if (!match) return undefined;

  const [, lng, lat] = match;
  return { lat: parseFloat(lat), lng: parseFloat(lng) };
};
