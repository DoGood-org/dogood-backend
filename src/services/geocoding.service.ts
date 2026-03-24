import { reverseGeocodeResponseSchema } from "@/schemas/geocoding.shema";
import { EnsureLocationInput, ReverseGeocodeResult } from "@/types/geocoding.types";
import { prisma } from '@/lib/prisma';


/**
 * Performs reverse geocoding to convert coordinates into address components.
 *
 * - Calls external geocoding service using { lat, lng }.
 * - Parses and validates the response.
 * - Normalizes address into { country, region, city }.
 *
 * Note:
 * - Different countries may return different fields (city, town, village, etc.),
 *   so fallback logic is applied.
 *
 * @param {number} lat - Latitude.
 * @param {number} lng - Longitude.
 * @returns {Promise<ReverseGeocodeResult | null>} Normalized address or null.
 */
export const reverseGeocode = async (
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult | null> => {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');

  const response = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'dogood-backend/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Reverse geocoding failed: ${response.status}`);
  }

  const rawData: unknown = await response.json();
  const data = reverseGeocodeResponseSchema.parse(rawData);

  const address = data.address;

  if (!address) {
    return null;
  }

  return {
    country: address.country ?? '',
    region: address.state ?? address.region ?? address.county ?? '',
    city: address.city ?? address.town ?? address.village ?? '',
    displayName: data.display_name,
  };
};

/**
 * Ensures that a location exists in the database.
 *
 * - Searches for an existing Location by { country, region, city }.
 * - If found — returns its ID.
 * - If not — creates a new record and returns its ID.
 *
 * This prevents duplicate locations and keeps data normalized.
 *
 * @param {{ country: string; region: string; city: string }} data - Location fields.
 * @returns {Promise<number | null>} Location ID or null if input is empty.
 */
export const ensureLocation = async (
  input: EnsureLocationInput
): Promise<number | null> => {
  const country = input.country.trim();
  const region = input.region.trim();
  const city = input.city.trim();

  if (!country && !region && !city) {
    return null;
  }

  const existingLocation = await prisma.location.findFirst({
    where: {
      country,
      region,
      city,
    },
    select: {
      id: true,
    },
  });

  if (existingLocation) {
    return existingLocation.id;
  }

  const newLocation = await prisma.location.create({
    data: {
      country,
      region,
      city,
    },
    select: {
      id: true,
    },
  });

  return newLocation.id;
};