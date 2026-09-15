import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { z } from 'zod';
import { ReverseGeocodeResult } from 'src/location/interfaces/location';

const reverseGeocodeResponseSchema = z.object({
  display_name: z.string().optional(),
  address: z
    .object({
      country: z.string().optional(),
      state: z.string().optional(),
      region: z.string().optional(),
      county: z.string().optional(),
      city: z.string().optional(),
      town: z.string().optional(),
      village: z.string().optional(),
    })
    .optional(),
});

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);

  async reverseGeocodeCoordinates(
    latitude: number,
    longitude: number,
  ): Promise<ReverseGeocodeResult | null> {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');

    url.searchParams.set('lat', String(latitude));
    url.searchParams.set('lon', String(longitude));
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');

    const responseBody = await this.fetchReverseGeocodeResponse(url.toString());
    const parsedResponse = reverseGeocodeResponseSchema.safeParse(responseBody);

    if (!parsedResponse.success) {
      this.logger.warn(
        `Reverse geocoding returned an invalid body: ${parsedResponse.error.message}`,
      );
      throw new ServiceUnavailableException('Geocoding service is unavailable');
    }

    const { address, display_name: displayName } = parsedResponse.data;

    if (!address) {
      return null;
    }

    return {
      country: address.country ?? '',
      region: address.state ?? address.region ?? address.county ?? '',
      city: address.city ?? address.town ?? address.village ?? '',
      displayName,
    };
  }

  private async fetchReverseGeocodeResponse(url: string): Promise<unknown> {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'dogood-backend/1.0' },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`Reverse geocoding failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown error';

      this.logger.warn(`Reverse geocoding request failed: ${reason}`);
      throw new ServiceUnavailableException('Geocoding service is unavailable');
    }
  }
}
