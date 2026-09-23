import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { LocationModule } from 'src/location/location.module';
import { OrganizationControllerV1 } from 'src/organization/controllers/v1/organization.controller';
import { OrganizationAdminV1Guard } from 'src/organization/guards/organization-admin-v1.guard';
import { OrganizationMapperV1 } from 'src/organization/mappers/v1/organization.mapper';
import { OrganizationAccessService } from 'src/organization/services/organization-access.service';
import { OrganizationServiceV1 } from 'src/organization/services/v1/organization.service';

@Module({
  imports: [DatabaseModule, LocationModule],
  controllers: [OrganizationControllerV1],
  providers: [
    OrganizationAccessService,
    OrganizationServiceV1,
    OrganizationMapperV1,
    OrganizationAdminV1Guard,
  ],
  exports: [OrganizationAccessService],
})
export class OrganizationModule {}
