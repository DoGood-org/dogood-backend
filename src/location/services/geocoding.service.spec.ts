import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { GeocodingService } from 'src/location/services/geocoding.service';

describe('GeocodingService', () => {
  const service = new GeocodingService();
  let fetchMock: jest.SpyInstance;

  const respondWith = (body: unknown, status = 200): void => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }));
  };

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('reverseGeocodeCoordinates', () => {
    it('should call Nominatim with the legacy query, User-Agent and a timeout signal', async () => {
      respondWith({ address: { country: 'Ukraine' } });

      await service.reverseGeocodeCoordinates(50.45, 30.52);

      expect(fetchMock).toHaveBeenCalledWith(
        'https://nominatim.openstreetmap.org/reverse?lat=50.45&lon=30.52&format=jsonv2&addressdetails=1',
        {
          headers: { 'User-Agent': 'dogood-backend/1.0' },
          signal: expect.any(AbortSignal),
        },
      );
    });

    it('should prefer state and city and pass display_name through', async () => {
      respondWith({
        display_name: 'Kyiv, Ukraine',
        address: {
          country: 'Ukraine',
          state: 'Kyiv Oblast',
          region: 'Region',
          county: 'County',
          city: 'Kyiv',
          town: 'Town',
          village: 'Village',
        },
      });

      const result = await service.reverseGeocodeCoordinates(50.45, 30.52);

      expect(result).toEqual({
        country: 'Ukraine',
        region: 'Kyiv Oblast',
        city: 'Kyiv',
        displayName: 'Kyiv, Ukraine',
      });
    });

    it('should fall back to region and town', async () => {
      respondWith({
        address: {
          region: 'Region',
          county: 'County',
          town: 'Town',
          village: 'Village',
        },
      });

      const result = await service.reverseGeocodeCoordinates(1, 2);

      expect(result).toEqual({
        country: '',
        region: 'Region',
        city: 'Town',
        displayName: undefined,
      });
    });

    it('should fall back to county and village', async () => {
      respondWith({ address: { county: 'County', village: 'Village' } });

      const result = await service.reverseGeocodeCoordinates(1, 2);

      expect(result).toEqual({
        country: '',
        region: 'County',
        city: 'Village',
        displayName: undefined,
      });
    });

    it('should return empty strings when the address has no known fields', async () => {
      respondWith({ address: {} });

      const result = await service.reverseGeocodeCoordinates(1, 2);

      expect(result).toEqual({
        country: '',
        region: '',
        city: '',
        displayName: undefined,
      });
    });

    it('should return null when the response has no address', async () => {
      respondWith({ error: 'Unable to geocode' });

      const result = await service.reverseGeocodeCoordinates(0, 0);

      expect(result).toBeNull();
    });

    it('should throw ServiceUnavailableException on a non-2xx response', async () => {
      respondWith({ error: 'Too many requests' }, 429);

      await expect(service.reverseGeocodeCoordinates(1, 2)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should throw ServiceUnavailableException when fetch rejects', async () => {
      fetchMock.mockRejectedValue(
        new DOMException('timed out', 'TimeoutError'),
      );

      await expect(service.reverseGeocodeCoordinates(1, 2)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should throw ServiceUnavailableException when the body is not JSON', async () => {
      fetchMock.mockResolvedValue(new Response('<html>', { status: 200 }));

      await expect(service.reverseGeocodeCoordinates(1, 2)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should throw ServiceUnavailableException when the body fails the schema', async () => {
      respondWith({ address: 'not an object' });

      await expect(service.reverseGeocodeCoordinates(1, 2)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });
});
