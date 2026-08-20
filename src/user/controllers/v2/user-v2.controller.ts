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
import { ZodValidationPipe } from 'nestjs-zod';
import { Public } from '@shared/decorators/public.decorator';
import { User } from '@shared/decorators/user.decorator';
import { CookieService } from '@shared/services/cookie.service';
import { ResponseWrapper } from '@shared/response/response.wrapper';
import { UserV2Service } from 'src/user/services/v2/user-v2.service';
import {
  GetUserProfilesRequestV2Dto,
  UpdateUserProfileRequestV2Dto,
  UpdateUserSettingsRequestV2Dto,
  getUserProfilesSchema,
  updateUserProfileSchema,
  updateUserSettingsSchema,
} from 'src/user/dto/v2/requests';
import {
  GetPublicUserProfileResponseV2Dto,
  GetUserProfileResponseV2Dto,
  GetUserProfilesResponseV2Dto,
  UpdateUserSettingsResponseV2Dto,
} from 'src/user/dto/v2/responses';

@Controller({ path: 'users', version: '2' })
export class UserV2Controller {
  constructor(
    private readonly userService: UserV2Service,
    private readonly cookieService: CookieService,
  ) {}

  @Get()
  async getUserProfiles(
    @Query(new ZodValidationPipe(getUserProfilesSchema))
    query: GetUserProfilesRequestV2Dto,
  ): Promise<ResponseWrapper<GetUserProfilesResponseV2Dto[]>> {
    const users = await this.userService.getUserProfiles(query);
    return new ResponseWrapper(users);
  }

  @Get('me')
  async getMyProfile(
    @User('id') id: string,
  ): Promise<ResponseWrapper<GetUserProfileResponseV2Dto>> {
    const user = await this.userService.getProfile(id);
    return new ResponseWrapper(user);
  }

  @Patch('me')
  async updateMyProfile(
    @User('id') id: string,
    @Body(new ZodValidationPipe(updateUserProfileSchema))
    input: UpdateUserProfileRequestV2Dto,
  ): Promise<ResponseWrapper<GetUserProfileResponseV2Dto>> {
    const user = await this.userService.updateProfile(id, input);
    return new ResponseWrapper(user);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMyAccount(
    @User('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.userService.deleteAccount(id);
    this.cookieService.clearAllCookies(response, [
      'accessToken',
      'refreshToken',
    ]);
  }

  @Patch('me/settings')
  async updateMySettings(
    @User('id') id: string,
    @Body(new ZodValidationPipe(updateUserSettingsSchema))
    input: UpdateUserSettingsRequestV2Dto,
  ): Promise<ResponseWrapper<UpdateUserSettingsResponseV2Dto>> {
    const settings = await this.userService.updateSettings(id, input);
    return new ResponseWrapper(settings);
  }

  @Get(':id')
  @Public()
  async getPublicProfile(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResponseWrapper<GetPublicUserProfileResponseV2Dto>> {
    const user = await this.userService.getPublicProfile(id);
    return new ResponseWrapper(user);
  }
}
