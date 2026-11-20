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
import { ApiOkResponse } from '@nestjs/swagger';
import { AuthV1 } from '@shared/decorators/auth-v1.decorator';
import { Public } from '@shared/decorators/public.decorator';
import { User } from '@shared/decorators/user.decorator';
import { SearchUsersByNameRequestDtoV1 } from 'src/user/dtos/requests/v1/search-users-by-name-request.dto';
import { UpdateUserProfileRequestDtoV1 } from 'src/user/dtos/requests/v1/update-user-profile-request.dto';
import { UpdateUserSettingsRequestDtoV1 } from 'src/user/dtos/requests/v1/update-user-settings-request.dto';
import {
  FullUserV1,
  PublicUserV1,
  UserDeletedResponseV1,
  UserMessageResponseV1,
  UserNameV1,
  UserResponseV1,
} from 'src/user/interfaces/user';
import { UserServiceV1 } from 'src/user/services/v1/user.service';
import { DeleteMyProfileResponseDtoV1 } from 'src/user/dtos/responses/v1/delete-my-profile-response.dto';
import {
  GetPublicUserProfileResponseDtoV1,
  GetUserProfileResponseDtoV1,
} from 'src/user/dtos/responses/v1/get-user-profile-response.dto';
import { SearchUsersByNameResponseDtoV1 } from 'src/user/dtos/responses/v1/search-users-by-name-response.dto';
import { UpdateMyProfileResponseDtoV1 } from 'src/user/dtos/responses/v1/update-my-profile-response.dto';
import { UpdateMySettingsResponseDtoV1 } from 'src/user/dtos/responses/v1/update-my-settings-response.dto';

// NOTE: legacy `userRoute` (`develop:src/routes/api/user.route.ts`); both profile reads had no authenticateUser.
@AuthV1()
@Controller({ path: 'user', version: '1' })
export class UserControllerV1 {
  constructor(private readonly userService: UserServiceV1) {}

  @Public()
  @Get('profile/public/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: GetPublicUserProfileResponseDtoV1 })
  async getPublicUserProfileById(
    @Param('id') id: string,
  ): Promise<UserResponseV1<{ user: PublicUserV1 }>> {
    return await this.userService.getPublicUserProfileById(id);
  }

  @Public()
  @Get('profile/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: GetUserProfileResponseDtoV1 })
  async getUserProfileById(
    @Param('id') id: string,
  ): Promise<UserResponseV1<{ user: FullUserV1 }>> {
    return await this.userService.getUserProfileById(id);
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: UpdateMyProfileResponseDtoV1 })
  async updateMyProfile(
    @User('id') userId: string,
    @Body() dto: UpdateUserProfileRequestDtoV1,
  ): Promise<UserResponseV1<{ user: FullUserV1 | null }>> {
    return await this.userService.updateMyProfile(userId, dto);
  }

  @Patch('settings')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: UpdateMySettingsResponseDtoV1 })
  async updateMySettings(
    @User('id') userId: string,
    @Body() dto: UpdateUserSettingsRequestDtoV1,
  ): Promise<UserResponseV1<{ settings: Record<string, never> }>> {
    return await this.userService.updateMySettings(userId, dto);
  }

  @Delete('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: DeleteMyProfileResponseDtoV1 })
  async deleteMyProfile(
    @User('id') userId: string,
  ): Promise<UserDeletedResponseV1> {
    return await this.userService.deleteMyProfile(userId);
  }

  @Post('name')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: SearchUsersByNameResponseDtoV1 })
  async searchUsersByName(
    @Body() dto: SearchUsersByNameRequestDtoV1,
  ): Promise<UserMessageResponseV1<{ users: UserNameV1[] }>> {
    return await this.userService.searchUsersByName(dto);
  }
}
