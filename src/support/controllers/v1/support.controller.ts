import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Public } from '@shared/decorators/public.decorator';
import { SiteAdminV1Guard } from '@shared/guards/site-admin-v1.guard';
import { CreateSupportMessageRequestDtoV1 } from 'src/support/dtos/requests/v1/create-support-message-request.dto';
import {
  SupportMessageV1,
  SupportResponseV1,
} from 'src/support/interfaces/support';
import { SupportServiceV1 } from 'src/support/services/v1/support.service';

// NOTE: legacy mounted every route without authenticateUser; reads are admin-only
// because they expose every sender's email, creating a message stays public.
@Controller({ path: 'support', version: '1' })
export class SupportControllerV1 {
  constructor(private readonly supportService: SupportServiceV1) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createSupportMessage(
    @Body() dto: CreateSupportMessageRequestDtoV1,
  ): Promise<SupportResponseV1<SupportMessageV1>> {
    return await this.supportService.createSupportMessage(dto);
  }

  @Get()
  @UseGuards(SiteAdminV1Guard)
  @HttpCode(HttpStatus.OK)
  async getSupportMessages(): Promise<SupportResponseV1<SupportMessageV1[]>> {
    return await this.supportService.getSupportMessages();
  }

  @Get(':id')
  @UseGuards(SiteAdminV1Guard)
  @HttpCode(HttpStatus.OK)
  async getSupportMessageById(
    @Param('id') id: string,
  ): Promise<SupportResponseV1<SupportMessageV1>> {
    return await this.supportService.getSupportMessageById(id);
  }
}
