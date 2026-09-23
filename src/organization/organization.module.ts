import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { LocationModule } from 'src/location/location.module';
import { OrganizationControllerV1 } from 'src/organization/controllers/v1/organization.controller';
import { OrganizationControllerV2 } from 'src/organization/controllers/v2/organization.controller';
import { OrganizationAdminV1Guard } from 'src/organization/guards/organization-admin-v1.guard';
import { OrganizationAdminV2Guard } from 'src/organization/guards/organization-admin-v2.guard';
import { OrganizationMapperV1 } from 'src/organization/mappers/v1/organization.mapper';
import { OrganizationMapperV2 } from 'src/organization/mappers/v2/organization.mapper';
import { OrganizationAccessService } from 'src/organization/services/organization-access.service';
import { OrganizationServiceV1 } from 'src/organization/services/v1/organization.service';
import { OrganizationServiceV2 } from 'src/organization/services/v2/organization.service';

@Module({
  imports: [DatabaseModule, LocationModule],
  controllers: [OrganizationControllerV1, OrganizationControllerV2],
  providers: [
    OrganizationAccessService,
    OrganizationServiceV1,
    OrganizationMapperV1,
    OrganizationServiceV2,
    OrganizationMapperV2,
    OrganizationAdminV1Guard,
    OrganizationAdminV2Guard,
  ],
  exports: [OrganizationAccessService],
})
export class OrganizationModule {}
