import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SiteAdminV1Guard } from 'src/organization/guards/site-admin-v1.guard';
import { AdminOrganizationsResponseV1 } from 'src/organization/interfaces/organization';
import { AdminOrganizationServiceV1 } from 'src/organization/services/v1/admin-organization.service';

@Controller({ path: 'admin/organizations', version: '1' })
export class AdminOrganizationControllerV1 {
  constructor(
    private readonly adminOrganizationService: AdminOrganizationServiceV1,
  ) {}

  // NOTE: the query is read raw, not through a zod DTO — legacy turns garbage into defaults, never a 400.
  @Get()
  @UseGuards(SiteAdminV1Guard)
  @HttpCode(HttpStatus.OK)
  async getOrganizationsForAdmin(
    @Query('page') page: unknown,
    @Query('limit') limit: unknown,
    @Query('search') search: unknown,
  ): Promise<AdminOrganizationsResponseV1> {
    return await this.adminOrganizationService.getOrganizationsForAdmin({
      page,
      limit,
      search,
    });
  }
}
