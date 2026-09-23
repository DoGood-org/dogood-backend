import { Injectable } from '@nestjs/common';
import { SuccessCode } from '@shared/constants/api-codes';
import {
  ContactCreatedResponseV1,
  ContactV1,
  SupportResponseV1,
} from 'src/support/interfaces/support';

@Injectable()
export class SupportMapperV1 {
  toSupportResponse<T>(data: T, code: SuccessCode): SupportResponseV1<T> {
    return { status: 'success', code, data };
  }

  toContactCreatedResponse(contact: ContactV1): ContactCreatedResponseV1 {
    return {
      status: 'success',
      code: SuccessCode.CONTACT_CREATED,
      message: 'Your message was sent successfully!',
      data: contact,
    };
  }
}
