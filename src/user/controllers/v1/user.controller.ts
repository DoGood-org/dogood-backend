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
  UseFilters,
} from '@nestjs/common';
import { Public } from '@shared/decorators/public.decorator';
import { User } from '@shared/decorators/user.decorator';
import { SuccessCode } from '@shared/constants/api-codes';
import {
  SearchUsersByNameRequestDtoV1,
  UpdateUserProfileRequestDtoV1,
  UpdateUserSettingsRequestDtoV1,
} from 'src/user/dtos/v1/requests';
import { ZodValidationExceptionFilterV1 } from 'src/user/filters/v1/zod-validation-exception.filter';
import {
  DeleteUserEnvelopeV1,
  PublicUserProfileV1,
  SearchUsersEnvelopeV1,
  SuccessEnvelopeV1,
  UserProfileV1,
  UserSettingsV1,
} from 'src/user/interfaces/v1/user';
import { UserServiceV1 } from 'src/user/services/v1/user.service';

@Controller({ path: 'user', version: '1' })
@UseFilters(ZodValidationExceptionFilterV1)
export class UserControllerV1 {
  constructor(private readonly userService: UserServiceV1) {}

  /**
   * NOTE: declared before `profile/:id`, otherwise `:id` swallows the literal `public`.
   * The only public endpoint of the module (docs/api/profile.docs.yaml:54).
   */
  @Public()
  @Get('profile/public/:id')
  async getPublicUserProfileById(
    @Param('id') id: string,
  ): Promise<SuccessEnvelopeV1<{ user: PublicUserProfileV1 }>> {
    const user = await this.userService.getPublicUserProfileById(id);

    return {
      status: 'success',
      code: SuccessCode.USER_PROFILE_RETRIEVED,
      data: { user },
    };
  }

  /** NOTE: authenticated on purpose — legacy left it open, see ADR-0005. */
  @Get('profile/:id')
  async getUserProfileById(
    @Param('id') id: string,
  ): Promise<SuccessEnvelopeV1<{ user: UserProfileV1 }>> {
    const user = await this.userService.getUserProfileById(id);

    return {
      status: 'success',
      code: SuccessCode.USER_PROFILE_RETRIEVED,
      data: { user },
    };
  }

  @Patch('profile')
  async updateMyProfile(
    @User('id') userId: string,
    @Body() input: UpdateUserProfileRequestDtoV1,
  ): Promise<SuccessEnvelopeV1<{ user: UserProfileV1 }>> {
    const user = await this.userService.updateMyProfile(userId, input);

    return {
      status: 'success',
      code: SuccessCode.USER_PROFILE_UPDATED,
      data: { user },
    };
  }

  @Patch('settings')
  async updateMySettings(
    @User('id') userId: string,
    @Body() input: UpdateUserSettingsRequestDtoV1,
  ): Promise<SuccessEnvelopeV1<{ settings: UserSettingsV1 }>> {
    const settings = await this.userService.updateMySettings(userId, input);

    return {
      status: 'success',
      code: SuccessCode.USER_SETTINGS_UPDATED,
      data: { settings },
    };
  }

  @Delete('profile')
  async deleteMyProfile(
    @User('id') userId: string,
  ): Promise<DeleteUserEnvelopeV1> {
    await this.userService.deleteMyProfile(userId);

    return { status: 'success', code: SuccessCode.USER_DELETED };
  }

  /**
   * NOTE: the search query travels in a POST body — legacy form, kept verbatim
   * (develop:src/routes/api/user.route.ts:33). `@HttpCode(200)` because Nest answers 201 to a
   * POST by default and the legacy endpoint answered 200 on both branches.
   */
  @Post('name')
  @HttpCode(HttpStatus.OK)
  async searchUsersByName(
    @Body() input: SearchUsersByNameRequestDtoV1,
  ): Promise<SearchUsersEnvelopeV1> {
    const users = await this.userService.searchUsersByName(input.name);
    const message =
      users.length === 0
        ? 'No users found with this name'
        : 'Users retrieved successfully';

    return {
      status: 'success',
      code: SuccessCode.USER_DATA_RETRIEVED,
      message,
      data: { users },
    };
  }
}
