import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { LocationModule } from 'src/location/location.module';
import { NotificationModule } from 'src/notification/notification.module';
import { AdminOrganizationControllerV1 } from 'src/organization/controllers/v1/admin-organization.controller';
import { OrganizationMembershipControllerV1 } from 'src/organization/controllers/v1/organization-membership.controller';
import { OrganizationControllerV1 } from 'src/organization/controllers/v1/organization.controller';
import { OrganizationMembershipControllerV2 } from 'src/organization/controllers/v2/organization-membership.controller';
import { OrganizationControllerV2 } from 'src/organization/controllers/v2/organization.controller';
import { OrganizationAdminV1Guard } from 'src/organization/guards/organization-admin-v1.guard';
import { OrganizationAdminV2Guard } from 'src/organization/guards/organization-admin-v2.guard';
import { SiteAdminV1Guard } from 'src/organization/guards/site-admin-v1.guard';
import { OrganizationMembershipMapperV1 } from 'src/organization/mappers/v1/organization-membership.mapper';
import { OrganizationMapperV1 } from 'src/organization/mappers/v1/organization.mapper';
import { OrganizationMembershipMapperV2 } from 'src/organization/mappers/v2/organization-membership.mapper';
import { OrganizationMapperV2 } from 'src/organization/mappers/v2/organization.mapper';
import { AdminOrganizationServiceV1 } from 'src/organization/services/v1/admin-organization.service';
import { OrganizationAccessService } from 'src/organization/services/organization-access.service';
import { OrganizationMembershipServiceV1 } from 'src/organization/services/v1/organization-membership.service';
import { OrganizationServiceV1 } from 'src/organization/services/v1/organization.service';
import { OrganizationMembershipServiceV2 } from 'src/organization/services/v2/organization-membership.service';
import { OrganizationServiceV2 } from 'src/organization/services/v2/organization.service';

@Module({
  imports: [DatabaseModule, LocationModule, NotificationModule],
  // NOTE: membership controllers come first — Nest matches routes in registration order, and v1
  // `DELETE :id` would otherwise swallow `DELETE members`.
  controllers: [
    OrganizationMembershipControllerV1,
    OrganizationMembershipControllerV2,
    OrganizationControllerV1,
    OrganizationControllerV2,
    AdminOrganizationControllerV1,
  ],
  providers: [
    OrganizationAccessService,
    OrganizationServiceV1,
    OrganizationMapperV1,
    OrganizationServiceV2,
    OrganizationMapperV2,
    OrganizationMembershipServiceV1,
    OrganizationMembershipMapperV1,
    OrganizationMembershipServiceV2,
    OrganizationMembershipMapperV2,
    OrganizationAdminV1Guard,
    OrganizationAdminV2Guard,
    AdminOrganizationServiceV1,
    SiteAdminV1Guard,
  ],
  exports: [OrganizationAccessService],
})
export class OrganizationModule {}
