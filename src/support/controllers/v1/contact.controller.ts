import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Public } from '@shared/decorators/public.decorator';
import { CreateContactRequestDtoV1 } from 'src/support/dtos/requests/v1/create-contact-request.dto';
import { ContactCreatedResponseV1 } from 'src/support/interfaces/support';
import { ContactServiceV1 } from 'src/support/services/v1/contact.service';

@Controller({ path: 'contact', version: '1' })
export class ContactControllerV1 {
  constructor(private readonly contactService: ContactServiceV1) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createContact(
    @Body() dto: CreateContactRequestDtoV1,
  ): Promise<ContactCreatedResponseV1> {
    return await this.contactService.createContact(dto);
  }
}
