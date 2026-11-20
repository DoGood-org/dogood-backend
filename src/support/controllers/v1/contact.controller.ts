import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiCreatedResponse } from '@nestjs/swagger';
import { Public } from '@shared/decorators/public.decorator';
import { CreateContactRequestDtoV1 } from 'src/support/dtos/requests/v1/create-contact-request.dto';
import { ContactCreatedResponseV1 } from 'src/support/interfaces/support';
import { ContactServiceV1 } from 'src/support/services/v1/contact.service';
import { CreateContactResponseDtoV1 } from 'src/support/dtos/responses/v1/create-contact-response.dto';

@Controller({ path: 'contact', version: '1' })
export class ContactControllerV1 {
  constructor(private readonly contactService: ContactServiceV1) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: CreateContactResponseDtoV1 })
  async createContact(
    @Body() dto: CreateContactRequestDtoV1,
  ): Promise<ContactCreatedResponseV1> {
    return await this.contactService.createContact(dto);
  }
}
