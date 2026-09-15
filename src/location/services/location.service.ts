import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import {
  LocationAddressInput,
  OwnerLocationInput,
} from 'src/location/interfaces/location';

@Injectable()
export class LocationService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreateLocation(
    address: LocationAddressInput,
  ): Promise<string | null> {
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
      locationId = await this.findOrCreateLocation(userLocation);
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
      locationId = await this.findOrCreateLocation(taskLocation);
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
