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
} from '@nestjs/common';
import { User } from '@shared/decorators/user.decorator';
import { CreateJoinRequestRequestDtoV1 } from 'src/organization/dtos/requests/v1/create-join-request-request.dto';
import { InviteOrganizationMemberRequestDtoV1 } from 'src/organization/dtos/requests/v1/invite-organization-member-request.dto';
import { UpdateJoinRequestStatusRequestDtoV1 } from 'src/organization/dtos/requests/v1/update-join-request-status-request.dto';
import { UpdateOrganizationMemberRoleRequestDtoV1 } from 'src/organization/dtos/requests/v1/update-organization-member-role-request.dto';
import {
  JoinRequestByIdResponseV1,
  OrganizationInviteCreatedV1,
  OrganizationInviteV1,
  OrganizationJoinRequestCreatedV1,
  OrganizationJoinRequestListItemV1,
  OrganizationJoinRequestV1,
  OrganizationMemberRoleUpdatedV1,
  OrganizationResponseV1,
  OrganizationResponseWithoutDataV1,
} from 'src/organization/interfaces/organization';
import { OrganizationMembershipServiceV1 } from 'src/organization/services/v1/organization-membership.service';

// NOTE: registered before OrganizationControllerV1 in the module, so `DELETE members` is matched before
// `DELETE :id` — legacy declared them the other way round and never reached this route.
@Controller({ path: 'organization', version: '1' })
export class OrganizationMembershipControllerV1 {
  constructor(
    private readonly membershipService: OrganizationMembershipServiceV1,
  ) {}

  @Post('members')
  @HttpCode(HttpStatus.CREATED)
  async inviteOrganizationMember(
    @User('id') userId: string,
    @Body() body: InviteOrganizationMemberRequestDtoV1,
  ): Promise<OrganizationResponseV1<{ invite: OrganizationInviteCreatedV1 }>> {
    return await this.membershipService.inviteOrganizationMember(body, userId);
  }

  // NOTE: legacy reads this body without validation, so its 400 keeps the legacy envelope and code.
  @Delete('members')
  @HttpCode(HttpStatus.OK)
  async removeOrganizationMember(
    @User('id') actingUserId: string,
    @Body('userId') userId: unknown,
    @Body('organizationId') organizationId: unknown,
  ): Promise<OrganizationResponseWithoutDataV1> {
    return await this.membershipService.removeOrganizationMember(
      userId,
      organizationId,
      actingUserId,
    );
  }

  @Patch('members/role')
  @HttpCode(HttpStatus.OK)
  async updateOrganizationMemberRole(
    @User('id') userId: string,
    @Body() body: UpdateOrganizationMemberRoleRequestDtoV1,
  ): Promise<
    OrganizationResponseV1<{ result: OrganizationMemberRoleUpdatedV1 }>
  > {
    return await this.membershipService.updateOrganizationMemberRole(
      body,
      userId,
    );
  }

  @Post('join-request')
  @HttpCode(HttpStatus.CREATED)
  async createJoinRequest(
    @User('id') userId: string,
    @Body() body: CreateJoinRequestRequestDtoV1,
  ): Promise<
    OrganizationResponseV1<{ joinRequest: OrganizationJoinRequestCreatedV1 }>
  > {
    return await this.membershipService.createJoinRequest(body, userId);
  }

  @Patch('join-request/status')
  @HttpCode(HttpStatus.OK)
  async updateJoinRequestStatus(
    @User('id') userId: string,
    @Body() body: UpdateJoinRequestStatusRequestDtoV1,
  ): Promise<
    OrganizationResponseV1<{
      result: OrganizationJoinRequestV1 | OrganizationInviteV1;
    }>
  > {
    return await this.membershipService.updateJoinRequestStatus(body, userId);
  }

  @Get('join-request/:id')
  @HttpCode(HttpStatus.OK)
  async getJoinRequestById(
    @User('id') userId: string,
    @Param('id') id: string,
  ): Promise<JoinRequestByIdResponseV1> {
    return await this.membershipService.getJoinRequestById(id, userId);
  }

  @Get(':organizationId/join-requests')
  @HttpCode(HttpStatus.OK)
  async getOrganizationJoinRequests(
    @User('id') userId: string,
    @Param('organizationId') organizationId: string,
  ): Promise<
    OrganizationResponseV1<{
      joinRequests: OrganizationJoinRequestListItemV1[];
    }>
  > {
    return await this.membershipService.getOrganizationJoinRequests(
      organizationId,
      userId,
    );
  }
}
