import { SuccessCode } from '@shared/constants/api-codes';
import { SupportMapperV1 } from 'src/support/mappers/v1/support.mapper';

describe('SupportMapperV1', () => {
  const mapper = new SupportMapperV1();

  it('should wrap data in the legacy envelope with the given code', () => {
    expect(
      mapper.toSupportResponse([], SuccessCode.SUPPORT_MESSAGES_FETCHED),
    ).toEqual({
      status: 'success',
      code: SuccessCode.SUPPORT_MESSAGES_FETCHED,
      data: [],
    });
  });

  it('should add the top-level message to the contact envelope', () => {
    const contact = {
      id: 'c-1',
      name: 'Ann',
      phone: '1234567',
      email: 'ann@b.co',
      message: 'Hi',
      createdAt: new Date('2026-09-24T00:00:00Z'),
    };

    expect(mapper.toContactCreatedResponse(contact)).toEqual({
      status: 'success',
      code: SuccessCode.CONTACT_CREATED,
      message: 'Your message was sent successfully!',
      data: contact,
    });
  });
});
