import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { GeocodingService } from 'src/location/services/geocoding.service';
import { LocationService } from 'src/location/services/location.service';

@Module({
  imports: [DatabaseModule],
  providers: [LocationService, GeocodingService],
  exports: [LocationService, GeocodingService],
})
export class LocationModule {}
