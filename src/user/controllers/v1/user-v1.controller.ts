import { Controller, Body, Patch, Get } from '@nestjs/common';
import { UserV1Service } from 'src/user/services/v1/user-v1.service';
import { UpdateUserRequestV1Dto } from 'src/user/dto/v1/requests';
import { UserProfileV1 } from 'src/user/interfaces/v1/user-v1';
import { User } from '@shared/decorators/user.decorator';
import { ResponseWrapper } from '@shared/response/response.wrapper';

@Controller({ path: 'user', version: '1' })
export class UserV1Controller {
  constructor(private readonly userService: UserV1Service) {}

  @Get()
  async findOne(
    @User('id') id: string,
  ): Promise<ResponseWrapper<UserProfileV1>> {
    const user = await this.userService.findById(id);
    return new ResponseWrapper(user);
  }

  @Patch()
  async update(
    @User('id') id: string,
    @Body() updateUserDto: UpdateUserRequestV1Dto,
  ): Promise<UserProfileV1> {
    return this.userService.update(id, updateUserDto);
  }
}
