import { SupportMessageStatus } from '@prisma/client';
import { SuccessCode } from '@shared/constants/api-codes';

export interface CreateSupportMessageDataV1 {
  email: string;
  subject: string;
  message: string;
}

export interface CreateContactDataV1 {
  name: string;
  phone: string;
  email: string;
  message: string;
}

export interface SupportMessageV1 {
  id: string;
  email: string;
  subject: string;
  message: string;
  status: SupportMessageStatus;
  createdAt: Date;
}

export interface ContactV1 {
  id: string;
  name: string;
  phone: string;
  email: string;
  message: string;
  createdAt: Date;
}

export interface SupportResponseV1<T> {
  status: 'success';
  code: SuccessCode;
  data: T;
}

export interface ContactCreatedResponseV1 extends SupportResponseV1<ContactV1> {
  message: string;
}
