import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { Public } from '@shared/decorators/public.decorator';
import { CreateSupportMessageRequestDtoV1 } from 'src/support/dtos/requests/v1/create-support-message-request.dto';
import {
  SupportMessageV1,
  SupportResponseV1,
} from 'src/support/interfaces/support';
import { SupportServiceV1 } from 'src/support/services/v1/support.service';

// NOTE: every route is public — legacy mounted them without authenticateUser.
@Public()
@Controller({ path: 'support', version: '1' })
export class SupportControllerV1 {
  constructor(private readonly supportService: SupportServiceV1) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createSupportMessage(
    @Body() dto: CreateSupportMessageRequestDtoV1,
  ): Promise<SupportResponseV1<SupportMessageV1>> {
    return await this.supportService.createSupportMessage(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getSupportMessages(): Promise<SupportResponseV1<SupportMessageV1[]>> {
    return await this.supportService.getSupportMessages();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getSupportMessageById(
    @Param('id') id: string,
  ): Promise<SupportResponseV1<SupportMessageV1>> {
    return await this.supportService.getSupportMessageById(id);
  }
}
