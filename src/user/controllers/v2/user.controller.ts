import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { Public } from '@shared/decorators/public.decorator';
import { User } from '@shared/decorators/user.decorator';
import { ResponseWrapper } from '@shared/response/response.wrapper';
import { CookieService } from '@shared/services/cookie.service';
import {
  GetUserProfilesRequestDtoV2,
  UpdateMyProfileRequestDtoV2,
  UpdateMySettingsRequestDtoV2,
} from 'src/user/dtos/v2/requests';
import {
  PublicUserProfileV2,
  UserProfileV2,
  UserSettingsV2,
} from 'src/user/interfaces/v2/user';
import { UserServiceV2 } from 'src/user/services/v2/user.service';

@Controller({ path: 'users', version: '2' })
export class UserControllerV2 {
  constructor(
    private readonly userService: UserServiceV2,
    private readonly cookieService: CookieService,
  ) {}

  @Get()
  async getUserProfiles(
    @Query() query: GetUserProfilesRequestDtoV2,
  ): Promise<ResponseWrapper<PublicUserProfileV2[]>> {
    return new ResponseWrapper(await this.userService.getUserProfiles(query));
  }

  @Get('my')
  async getMyProfile(
    @User('id') userId: string,
  ): Promise<ResponseWrapper<UserProfileV2>> {
    return new ResponseWrapper(await this.userService.getMyProfile(userId));
  }

  @Patch('my')
  async updateMyProfile(
    @User('id') userId: string,
    @Body() input: UpdateMyProfileRequestDtoV2,
  ): Promise<ResponseWrapper<UserProfileV2>> {
    return new ResponseWrapper(
      await this.userService.updateMyProfile(userId, input),
    );
  }

  @Patch('my/settings')
  async updateMySettings(
    @User('id') userId: string,
    @Body() input: UpdateMySettingsRequestDtoV2,
  ): Promise<ResponseWrapper<UserSettingsV2>> {
    return new ResponseWrapper(
      await this.userService.updateMySettings(userId, input),
    );
  }

  @Delete('my')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMyProfile(
    @User('id') userId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.userService.deleteMyProfile(userId);
    this.cookieService.clearAllCookies(response, [
      'accessToken',
      'refreshToken',
    ]);
  }

  /** NOTE: declared after every `my` route, otherwise `:id` swallows them. */
  @Public()
  @Get(':id')
  async getUserProfileById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResponseWrapper<PublicUserProfileV2>> {
    return new ResponseWrapper(await this.userService.getUserProfileById(id));
  }
}
