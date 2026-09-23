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
import { Public } from '@shared/decorators/public.decorator';
import { User } from '@shared/decorators/user.decorator';
import { ResponseWrapper } from '@shared/response/response.wrapper';
import { CreateOrganizationRequestDtoV2 } from 'src/organization/dtos/requests/v2/create-organization-request.dto';
import { GetOrganizationMembersRequestDtoV2 } from 'src/organization/dtos/requests/v2/get-organization-members-request.dto';
import { GetOrganizationTasksRequestDtoV2 } from 'src/organization/dtos/requests/v2/get-organization-tasks-request.dto';
import { GetOrganizationsRequestDtoV2 } from 'src/organization/dtos/requests/v2/get-organizations-request.dto';
import { UpdateOrganizationRequestDtoV2 } from 'src/organization/dtos/requests/v2/update-organization-request.dto';
import { OrganizationAdminV2Guard } from 'src/organization/guards/organization-admin-v2.guard';
import {
  OrganizationMemberV2,
  OrganizationSummaryV2,
  OrganizationTaskV2,
  OrganizationV2,
} from 'src/organization/interfaces/organization';
import { OrganizationServiceV2 } from 'src/organization/services/v2/organization.service';

@Controller({ path: 'organizations', version: '2' })
export class OrganizationControllerV2 {
  constructor(private readonly organizationService: OrganizationServiceV2) {}

  @Get()
  @Public()
  @HttpCode(HttpStatus.OK)
  async getOrganizations(
    @Query() query: GetOrganizationsRequestDtoV2,
  ): Promise<ResponseWrapper<OrganizationSummaryV2[]>> {
    return new ResponseWrapper(
      await this.organizationService.getOrganizations(query),
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrganization(
    @User('id') userId: string,
    @Body() body: CreateOrganizationRequestDtoV2,
  ): Promise<ResponseWrapper<OrganizationV2>> {
    return new ResponseWrapper(
      await this.organizationService.createOrganization(body, userId),
    );
  }

  @Get(':id')
  @Public()
  @HttpCode(HttpStatus.OK)
  async getOrganizationById(
    @Param('id') id: string,
  ): Promise<ResponseWrapper<OrganizationV2>> {
    return new ResponseWrapper(
      await this.organizationService.getOrganizationById(id),
    );
  }

  @Get(':id/members')
  @Public()
  @HttpCode(HttpStatus.OK)
  async getOrganizationMembers(
    @Param('id') id: string,
    @Query() query: GetOrganizationMembersRequestDtoV2,
  ): Promise<ResponseWrapper<OrganizationMemberV2[]>> {
    return new ResponseWrapper(
      await this.organizationService.getOrganizationMembers(id, query),
    );
  }

  @Get(':id/tasks')
  @Public()
  @HttpCode(HttpStatus.OK)
  async getOrganizationTasks(
    @Param('id') id: string,
    @Query() query: GetOrganizationTasksRequestDtoV2,
  ): Promise<ResponseWrapper<OrganizationTaskV2[]>> {
    return new ResponseWrapper(
      await this.organizationService.getOrganizationTasks(id, query),
    );
  }

  @Patch(':id')
  @UseGuards(OrganizationAdminV2Guard)
  @HttpCode(HttpStatus.OK)
  async updateOrganization(
    @Param('id') id: string,
    @Body() body: UpdateOrganizationRequestDtoV2,
  ): Promise<ResponseWrapper<OrganizationV2>> {
    return new ResponseWrapper(
      await this.organizationService.updateOrganization(id, body),
    );
  }

  @Delete(':id')
  @UseGuards(OrganizationAdminV2Guard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOrganization(@Param('id') id: string): Promise<void> {
    await this.organizationService.deleteOrganization(id);
  }
}
