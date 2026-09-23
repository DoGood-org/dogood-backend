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
import { User } from '@shared/decorators/user.decorator';
import { ResponseWrapper } from '@shared/response/response.wrapper';
import { GetOrganizationJoinRequestsRequestDtoV2 } from 'src/organization/dtos/requests/v2/get-organization-join-requests-request.dto';
import { InviteOrganizationMemberRequestDtoV2 } from 'src/organization/dtos/requests/v2/invite-organization-member-request.dto';
import { UpdateMembershipRequestStatusRequestDtoV2 } from 'src/organization/dtos/requests/v2/update-membership-request-status-request.dto';
import { UpdateOrganizationMemberRoleRequestDtoV2 } from 'src/organization/dtos/requests/v2/update-organization-member-role-request.dto';
import { OrganizationAdminV2Guard } from 'src/organization/guards/organization-admin-v2.guard';
import {
  MembershipRequestStatusV2,
  OrganizationInviteDetailsV2,
  OrganizationInviteV2,
  OrganizationJoinRequestDetailsV2,
  OrganizationJoinRequestV2,
  OrganizationMemberRoleV2,
} from 'src/organization/interfaces/organization';
import { OrganizationMembershipServiceV2 } from 'src/organization/services/v2/organization-membership.service';

// NOTE: the static `join-requests/*` and `invites/*` routes are declared before every `:id/*` route.
@Controller({ path: 'organizations', version: '2' })
export class OrganizationMembershipControllerV2 {
  constructor(
    private readonly membershipService: OrganizationMembershipServiceV2,
  ) {}

  @Get('join-requests/:requestId')
  @HttpCode(HttpStatus.OK)
  async getOrganizationJoinRequest(
    @User('id') userId: string,
    @Param('requestId') requestId: string,
  ): Promise<ResponseWrapper<OrganizationJoinRequestDetailsV2>> {
    return new ResponseWrapper(
      await this.membershipService.getOrganizationJoinRequest(
        requestId,
        userId,
      ),
    );
  }

  @Get('invites/:inviteId')
  @HttpCode(HttpStatus.OK)
  async getOrganizationInvite(
    @User('id') userId: string,
    @Param('inviteId') inviteId: string,
  ): Promise<ResponseWrapper<OrganizationInviteDetailsV2>> {
    return new ResponseWrapper(
      await this.membershipService.getOrganizationInvite(inviteId, userId),
    );
  }

  @Patch('invites/:inviteId')
  @HttpCode(HttpStatus.OK)
  async updateOrganizationInviteStatus(
    @User('id') userId: string,
    @Param('inviteId') inviteId: string,
    @Body() body: UpdateMembershipRequestStatusRequestDtoV2,
  ): Promise<ResponseWrapper<MembershipRequestStatusV2>> {
    return new ResponseWrapper(
      await this.membershipService.updateOrganizationInviteStatus(
        inviteId,
        userId,
        body,
      ),
    );
  }

  @Post(':id/invites')
  @HttpCode(HttpStatus.CREATED)
  async inviteOrganizationMember(
    @User('id') userId: string,
    @Param('id') id: string,
    @Body() body: InviteOrganizationMemberRequestDtoV2,
  ): Promise<ResponseWrapper<OrganizationInviteV2>> {
    return new ResponseWrapper(
      await this.membershipService.inviteOrganizationMember(id, userId, body),
    );
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeOrganizationMember(
    @User('id') actingUserId: string,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<void> {
    await this.membershipService.removeOrganizationMember(
      id,
      userId,
      actingUserId,
    );
  }

  @Patch(':id/members/:userId/role')
  @UseGuards(OrganizationAdminV2Guard)
  @HttpCode(HttpStatus.OK)
  async updateOrganizationMemberRole(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() body: UpdateOrganizationMemberRoleRequestDtoV2,
  ): Promise<ResponseWrapper<OrganizationMemberRoleV2>> {
    return new ResponseWrapper(
      await this.membershipService.updateOrganizationMemberRole(
        id,
        userId,
        body,
      ),
    );
  }

  @Post(':id/join-requests')
  @HttpCode(HttpStatus.CREATED)
  async createOrganizationJoinRequest(
    @User('id') userId: string,
    @Param('id') id: string,
  ): Promise<ResponseWrapper<OrganizationJoinRequestV2>> {
    return new ResponseWrapper(
      await this.membershipService.createOrganizationJoinRequest(id, userId),
    );
  }

  @Get(':id/join-requests')
  @HttpCode(HttpStatus.OK)
  async getOrganizationJoinRequests(
    @User('id') userId: string,
    @Param('id') id: string,
    @Query() query: GetOrganizationJoinRequestsRequestDtoV2,
  ): Promise<ResponseWrapper<OrganizationJoinRequestDetailsV2[]>> {
    return new ResponseWrapper(
      await this.membershipService.getOrganizationJoinRequests(
        id,
        userId,
        query,
      ),
    );
  }

  @Patch(':id/join-requests/:requestId')
  @HttpCode(HttpStatus.OK)
  async updateOrganizationJoinRequestStatus(
    @User('id') userId: string,
    @Param('id') id: string,
    @Param('requestId') requestId: string,
    @Body() body: UpdateMembershipRequestStatusRequestDtoV2,
  ): Promise<ResponseWrapper<MembershipRequestStatusV2>> {
    return new ResponseWrapper(
      await this.membershipService.updateOrganizationJoinRequestStatus(
        id,
        requestId,
        userId,
        body,
      ),
    );
  }
}
