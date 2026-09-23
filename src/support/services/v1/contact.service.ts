import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { ErrorCode } from '@shared/constants/api-codes';
import { V1ApiException } from '@shared/exceptions/v1-api.exception';
import { SupportMapperV1 } from 'src/support/mappers/v1/support.mapper';
import {
  ContactCreatedResponseV1,
  CreateContactDataV1,
} from 'src/support/interfaces/support';

@Injectable()
export class ContactServiceV1 {
  private readonly logger = new Logger(ContactServiceV1.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supportMapper: SupportMapperV1,
  ) {}

  async createContact(
    data: CreateContactDataV1,
  ): Promise<ContactCreatedResponseV1> {
    const { name, phone, email, message } = data;

    try {
      const contact = await this.prisma.contact.create({
        data: { name, phone, email, message },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          message: true,
          createdAt: true,
        },
      });

      this.logger.log(`Contact form submitted: ${contact.id}`);

      return this.supportMapper.toContactCreatedResponse(contact);
    } catch (error) {
      this.logger.error('Failed to submit contact form', error);

      throw new V1ApiException(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Failed to submit contact form',
        ErrorCode.CONTACT_CREATION_FAILED,
      );
    }
  }
}
