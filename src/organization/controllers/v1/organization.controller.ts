import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { AuthV1 } from '@shared/decorators/auth-v1.decorator';
import { Public } from '@shared/decorators/public.decorator';
import { User } from '@shared/decorators/user.decorator';
import { CreateOrganizationRequestDtoV1 } from 'src/organization/dtos/requests/v1/create-organization-request.dto';
import { UpdateOrganizationRequestDtoV1 } from 'src/organization/dtos/requests/v1/update-organization-request.dto';
import { OrganizationAdminV1Guard } from 'src/organization/guards/organization-admin-v1.guard';
import {
  OrganizationCreatedV1,
  OrganizationDetailsV1,
  OrganizationMemberV1,
  OrganizationResponseV1,
  OrganizationSummaryV1,
  OrganizationUpdatedV1,
} from 'src/organization/interfaces/organization';
import { OrganizationServiceV1 } from 'src/organization/services/v1/organization.service';
import {
  CreateOrganizationResponseDtoV1,
  DeleteOrganizationResponseDtoV1,
  GetOrganizationMembersResponseDtoV1,
  GetOrganizationResponseDtoV1,
  GetOrganizationsByNameResponseDtoV1,
  UpdateOrganizationResponseDtoV1,
} from 'src/organization/dtos/responses/v1/organization-response.dto';

@AuthV1()
@Controller({ path: 'organization', version: '1' })
export class OrganizationControllerV1 {
  constructor(private readonly organizationService: OrganizationServiceV1) {}

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: CreateOrganizationResponseDtoV1 })
  async createOrganization(
    @User('id') userId: string,
    @Body() body: CreateOrganizationRequestDtoV1,
  ): Promise<OrganizationResponseV1<{ organization: OrganizationCreatedV1 }>> {
    return await this.organizationService.createOrganization(body, userId);
  }

  // NOTE: `name` is read raw, not through a zod DTO, so its 400 keeps the legacy envelope and code.
  @Get()
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiQuery({ name: 'name', required: true, type: String })
  @ApiOkResponse({ type: GetOrganizationsByNameResponseDtoV1 })
  async getOrganizationsByName(
    @Query('name') name: unknown,
  ): Promise<OrganizationResponseV1<OrganizationSummaryV1[]>> {
    return await this.organizationService.getOrganizationsByName(name);
  }

  @Get(':id')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: GetOrganizationResponseDtoV1 })
  async getOrganizationById(
    @Param('id') id: string,
  ): Promise<OrganizationResponseV1<{ organization: OrganizationDetailsV1 }>> {
    return await this.organizationService.getOrganizationById(id);
  }

  @Patch(':id')
  @UseGuards(OrganizationAdminV1Guard)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: UpdateOrganizationResponseDtoV1 })
  async updateOrganization(
    @Param('id') id: string,
    @Body() body: UpdateOrganizationRequestDtoV1,
  ): Promise<OrganizationResponseV1<{ organization: OrganizationUpdatedV1 }>> {
    return await this.organizationService.updateOrganization(id, body);
  }

  @Delete(':id')
  @UseGuards(OrganizationAdminV1Guard)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: DeleteOrganizationResponseDtoV1 })
  async deleteOrganization(
    @Param('id') id: string,
  ): Promise<OrganizationResponseV1<{ result: { message: string } }>> {
    return await this.organizationService.deleteOrganization(id);
  }

  @Get(':organizationId/members')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: GetOrganizationMembersResponseDtoV1 })
  async getOrganizationMembers(
    @Param('organizationId') organizationId: string,
  ): Promise<OrganizationResponseV1<{ members: OrganizationMemberV1[] }>> {
    return await this.organizationService.getOrganizationMembers(
      organizationId,
    );
  }
}
