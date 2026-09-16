import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import {
  LocationAddressInput,
  OwnerLocationInput,
} from 'src/location/interfaces/location';

const trimAddress = (
  address: LocationAddressInput,
): LocationAddressInput | null => {
  const { country, region, city } = address;
  const trimmedAddress: LocationAddressInput = {
    country: country.trim(),
    region: region.trim(),
    city: city.trim(),
  };

  if (
    !trimmedAddress.country &&
    !trimmedAddress.region &&
    !trimmedAddress.city
  ) {
    return null;
  }

  return trimmedAddress;
};

@Injectable()
export class LocationService {
  constructor(private readonly prisma: PrismaService) {}

  async getLocationId(address: LocationAddressInput): Promise<string | null> {
    const trimmedAddress = trimAddress(address);

    if (trimmedAddress === null) {
      return null;
    }

    const location = await this.prisma.location.findUnique({
      where: { country_region_city: trimmedAddress },
      select: { id: true },
    });

    return location?.id ?? null;
  }

  async createLocation(address: LocationAddressInput): Promise<string | null> {
    const trimmedAddress = trimAddress(address);

    if (trimmedAddress === null) {
      return null;
    }

    try {
      const { id } = await this.prisma.location.upsert({
        where: { country_region_city: trimmedAddress },
        create: trimmedAddress,
        update: {},
        select: { id: true },
      });

      return id;
    } catch (error) {
      // NOTE: Prisma runs this upsert as SELECT + INSERT, not ON CONFLICT, so a concurrent insert of the same address raises P2002.
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2002'
      ) {
        throw error;
      }

      const { id } = await this.prisma.location.findUniqueOrThrow({
        where: { country_region_city: trimmedAddress },
        select: { id: true },
      });

      return id;
    }
  }

  async setUserLocation(
    userId: string,
    userLocation: OwnerLocationInput | null,
  ): Promise<void> {
    let locationId: string | null = null;

    if (userLocation !== null) {
      locationId = await this.getLocationId(userLocation);

      if (locationId === null) {
        locationId = await this.createLocation(userLocation);
      }
    }

    if (userLocation === null || locationId === null) {
      await this.prisma.userLocation.deleteMany({ where: { userId } });

      return;
    }

    const { name, latitude, longitude } = userLocation;

    await this.prisma.userLocation.upsert({
      where: { userId },
      create: { userId, locationId, name, latitude, longitude },
      update: { locationId, name, latitude, longitude },
      select: { id: true },
    });
  }

  async setTaskLocation(
    taskId: string,
    taskLocation: OwnerLocationInput | null,
  ): Promise<void> {
    let locationId: string | null = null;

    if (taskLocation !== null) {
      locationId = await this.getLocationId(taskLocation);

      if (locationId === null) {
        locationId = await this.createLocation(taskLocation);
      }
    }

    if (taskLocation === null || locationId === null) {
      await this.prisma.taskLocation.deleteMany({ where: { taskId } });

      return;
    }

    const { name, latitude, longitude } = taskLocation;

    await this.prisma.taskLocation.upsert({
      where: { taskId },
      create: { taskId, locationId, name, latitude, longitude },
      update: { locationId, name, latitude, longitude },
      select: { id: true },
    });
  }
}
