import { Controller, Body, Patch, Get } from '@nestjs/common';
import { UserService } from '../services/user.service';
import { UpdateUserDto } from '../dto/update-user.dto';
import { User } from '@shared/decorators/user.decorator';
import { ResponseWrapper } from '@shared/response/response.wrapper';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async findOne(@User('id') id: string) {
    const user = await this.userService.findById(id);
    return new ResponseWrapper(user);
  }

  @Patch()
  async update(@User('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }
}
