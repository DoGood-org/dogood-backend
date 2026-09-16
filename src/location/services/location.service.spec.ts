import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { OwnerLocationData } from 'src/location/interfaces/location';
import { LocationService } from 'src/location/services/location.service';

describe('LocationService', () => {
  const prisma = {
    location: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    userLocation: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    taskLocation: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  const kyivAddress = {
    country: 'Ukraine',
    region: 'Kyiv Oblast',
    city: 'Kyiv',
  };
  const podilLocation: OwnerLocationData = {
    ...kyivAddress,
    name: 'Podil',
    latitude: 50.46,
    longitude: 30.51,
  };
  let service: LocationService;

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        LocationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(LocationService);
  });

  describe('getLocationId', () => {
    it('should trim the address and read it in one query', async () => {
      prisma.location.findUnique.mockResolvedValue({ id: 'location-id' });

      const locationId = await service.getLocationId({
        country: ' Ukraine ',
        region: 'Kyiv Oblast  ',
        city: '\tKyiv',
      });

      expect(locationId).toBe('location-id');
      expect(prisma.location.findUnique).toHaveBeenCalledTimes(1);
      expect(prisma.location.findUnique).toHaveBeenCalledWith({
        where: { country_region_city: kyivAddress },
        select: { id: true },
      });
      expect(prisma.location.upsert).not.toHaveBeenCalled();
    });

    it('should return null when no row matches the address', async () => {
      prisma.location.findUnique.mockResolvedValue(null);

      const locationId = await service.getLocationId(kyivAddress);

      expect(locationId).toBeNull();
    });

    it('should return null without a query when every part is blank', async () => {
      const locationId = await service.getLocationId({
        country: ' ',
        region: '',
        city: '\n',
      });

      expect(locationId).toBeNull();
      expect(prisma.location.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('createLocation', () => {
    it('should trim the address and upsert it in one query', async () => {
      prisma.location.upsert.mockResolvedValue({ id: 'location-id' });

      const locationId = await service.createLocation({
        country: ' Ukraine ',
        region: 'Kyiv Oblast  ',
        city: '\tKyiv',
      });

      expect(locationId).toBe('location-id');
      expect(prisma.location.upsert).toHaveBeenCalledTimes(1);
      expect(prisma.location.upsert).toHaveBeenCalledWith({
        where: { country_region_city: kyivAddress },
        create: kyivAddress,
        update: {},
        select: { id: true },
      });
      expect(prisma.location.findUniqueOrThrow).not.toHaveBeenCalled();
    });

    it('should keep empty parts of a partial address as empty strings', async () => {
      prisma.location.upsert.mockResolvedValue({ id: 'location-id' });

      await service.createLocation({
        country: 'Ukraine',
        region: ' ',
        city: '',
      });

      expect(prisma.location.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: { country: 'Ukraine', region: '', city: '' },
        }),
      );
    });

    it('should return null without a query when every part is blank', async () => {
      const locationId = await service.createLocation({
        country: ' ',
        region: '',
        city: '\n',
      });

      expect(locationId).toBeNull();
      expect(prisma.location.upsert).not.toHaveBeenCalled();
    });

    it('should re-read the row when a concurrent insert raises P2002', async () => {
      prisma.location.upsert.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );
      prisma.location.findUniqueOrThrow.mockResolvedValue({
        id: 'existing-id',
      });

      const locationId = await service.createLocation(kyivAddress);

      expect(locationId).toBe('existing-id');
      expect(prisma.location.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { country_region_city: kyivAddress },
        select: { id: true },
      });
    });

    it('should rethrow any other error', async () => {
      const connectionError = new Error('connection lost');

      prisma.location.upsert.mockRejectedValue(connectionError);

      await expect(service.createLocation(kyivAddress)).rejects.toBe(
        connectionError,
      );
      expect(prisma.location.findUniqueOrThrow).not.toHaveBeenCalled();
    });
  });

  describe('setUserLocation', () => {
    it('should reuse an existing address without creating it', async () => {
      prisma.location.findUnique.mockResolvedValue({ id: 'location-id' });

      await service.setUserLocation('user-id', podilLocation);

      expect(prisma.location.upsert).not.toHaveBeenCalled();
      expect(prisma.userLocation.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-id' } }),
      );
    });

    it('should create the address when it does not exist yet', async () => {
      prisma.location.findUnique.mockResolvedValue(null);
      prisma.location.upsert.mockResolvedValue({ id: 'location-id' });

      await service.setUserLocation('user-id', podilLocation);

      expect(prisma.userLocation.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
        create: {
          userId: 'user-id',
          locationId: 'location-id',
          name: 'Podil',
          latitude: 50.46,
          longitude: 30.51,
        },
        update: {
          locationId: 'location-id',
          name: 'Podil',
          latitude: 50.46,
          longitude: 30.51,
        },
        select: { id: true },
      });
    });

    it('should change nothing when the address is blank', async () => {
      await service.setUserLocation('user-id', {
        country: '',
        region: ' ',
        city: '',
        name: 'Somewhere',
        latitude: 1,
        longitude: 2,
      });

      expect(prisma.location.findUnique).not.toHaveBeenCalled();
      expect(prisma.location.upsert).not.toHaveBeenCalled();
      expect(prisma.userLocation.upsert).not.toHaveBeenCalled();
      expect(prisma.userLocation.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('deleteUserLocation', () => {
    it('should delete only the user location row', async () => {
      await service.deleteUserLocation('user-id');

      expect(prisma.userLocation.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
      });
      expect(Object.keys(prisma.location)).toEqual([
        'findUnique',
        'upsert',
        'findUniqueOrThrow',
      ]);
    });
  });

  describe('setTaskLocation', () => {
    it('should reuse an existing address without creating it', async () => {
      prisma.location.findUnique.mockResolvedValue({ id: 'location-id' });

      await service.setTaskLocation('task-id', podilLocation);

      expect(prisma.location.upsert).not.toHaveBeenCalled();
      expect(prisma.taskLocation.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { taskId: 'task-id' } }),
      );
    });

    it('should create the address when it does not exist yet', async () => {
      prisma.location.findUnique.mockResolvedValue(null);
      prisma.location.upsert.mockResolvedValue({ id: 'location-id' });

      await service.setTaskLocation('task-id', podilLocation);

      expect(prisma.taskLocation.upsert).toHaveBeenCalledWith({
        where: { taskId: 'task-id' },
        create: {
          taskId: 'task-id',
          locationId: 'location-id',
          name: 'Podil',
          latitude: 50.46,
          longitude: 30.51,
        },
        update: {
          locationId: 'location-id',
          name: 'Podil',
          latitude: 50.46,
          longitude: 30.51,
        },
        select: { id: true },
      });
    });

    it('should change nothing when the address is blank', async () => {
      await service.setTaskLocation('task-id', {
        country: '',
        region: ' ',
        city: '',
        name: 'Somewhere',
        latitude: 1,
        longitude: 2,
      });

      expect(prisma.location.findUnique).not.toHaveBeenCalled();
      expect(prisma.location.upsert).not.toHaveBeenCalled();
      expect(prisma.taskLocation.upsert).not.toHaveBeenCalled();
      expect(prisma.taskLocation.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('deleteTaskLocation', () => {
    it('should delete only the task location row', async () => {
      await service.deleteTaskLocation('task-id');

      expect(prisma.taskLocation.deleteMany).toHaveBeenCalledWith({
        where: { taskId: 'task-id' },
      });
      expect(Object.keys(prisma.location)).toEqual([
        'findUnique',
        'upsert',
        'findUniqueOrThrow',
      ]);
    });
  });
});
