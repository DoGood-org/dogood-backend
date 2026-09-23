import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { OrganizationAccessService } from 'src/organization/services/organization-access.service';

@Module({
  imports: [DatabaseModule],
  providers: [OrganizationAccessService],
  exports: [OrganizationAccessService],
})
export class OrganizationModule {}
